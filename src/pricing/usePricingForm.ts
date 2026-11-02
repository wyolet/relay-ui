import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreatePricing, useUpdatePricing } from "@/api/hooks/pricings";
import type {
	Pricing,
	PricingCreate,
	PricingRate,
	PricingUpdate,
} from "@/api/types/pricing";
import type { components } from "@/api/types.gen";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { firstError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import { PRICING_METERS, type PRICING_UNITS } from "@/lib/usage-math/pricing";
import { toast } from "@/shared/Toast";

type Owner = components["schemas"]["Owner"];

// Derived from the generated PricingRate schema — the full set the server accepts.
// PRICING_METERS is the UI subset offered in pickers.
export type PricingMeter = components["schemas"]["PricingRate"]["meter"];
export type PricingUnit = (typeof PRICING_UNITS)[number];

export interface RateDraft {
	meter: PricingMeter;
	unit: PricingUnit;
	/** Decimal string, e.g. "3" or "0.30". */
	amount: string;
	/** Tier threshold; "" marks the meter's base rate. */
	aboveTokens: string;
}

export interface PricingFormValues {
	displayName: string;
	description: string;
	/** Owning host UUID — the relay requires owner {kind:"host", id}. */
	host: string;
	currency: string;
	targetModels: string[];
	rates: RateDraft[];
}

const rateSchema = z.object({
	meter: z.string().trim().min(1, "Meter is required"),
	unit: z.string().trim().min(1, "Unit is required"),
	// The relay validates amount > 0.
	amount: z
		.string()
		.trim()
		.min(1, "Amount is required")
		.refine((s) => Number.isFinite(Number(s)), "Enter a number")
		.refine((s) => Number(s) > 0, "Amount must be greater than 0"),
	// "" marks the base rate; otherwise a whole token threshold ≥ 1.
	aboveTokens: z
		.string()
		.refine(
			(s) => s === "" || (/^\d+$/.test(s) && Number(s) >= 1),
			"Threshold must be a whole token count ≥ 1",
		),
});

const schema = z
	.object({
		displayName: z
			.string()
			.trim()
			.min(1, "Display name is required — the slug is generated from it")
			.max(120, "Display name is too long"),
		description: z.string().trim().max(500, "Description is too long"),
		host: z
			.string()
			.min(1, "Owning host is required — rate sheets belong to a host"),
		currency: z
			.string()
			.trim()
			.regex(/^[A-Za-z]{3}$/, "Use a 3-letter ISO code (USD, EUR, …)"),
		targetModels: z.array(z.string()).min(1, "Pick at least one target model"),
		rates: z.array(rateSchema).min(1, "At least one rate is required"),
	})
	.superRefine((val, ctx) => {
		// Mirrors the relay's Validate(): no two rates may share (meter, aboveTokens).
		const seen = new Set<string>();
		val.rates.forEach((r, idx) => {
			const key = `${r.meter}|${r.aboveTokens === "" ? "0" : r.aboveTokens}`;
			if (seen.has(key)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["rates", idx, "aboveTokens"],
					message:
						r.aboveTokens === ""
							? "This meter already has a base rate — set a tier threshold"
							: "Duplicate tier threshold for this meter",
				});
			}
			seen.add(key);
		});
	});

export function emptyRate(meter: PricingMeter = "tokens.input"): RateDraft {
	return { meter, unit: "per_million", amount: "", aboveTokens: "" };
}

/** Fields a new pricing can start from, e.g. an unpriced binding. */
export interface PricingPrefill {
	host?: string;
	targetModels?: string[];
}

function emptyValues(prefill: PricingPrefill = {}): PricingFormValues {
	return {
		displayName: "",
		description: "",
		host: prefill.host ?? "",
		currency: "USD",
		targetModels: prefill.targetModels ?? [],
		rates: [emptyRate("tokens.input"), emptyRate("tokens.output")],
	};
}

function pricingToValues(pricing: Pricing): PricingFormValues {
	const specRates = pricing.spec.rates ?? null;
	const rates: RateDraft[] =
		specRates && specRates.length > 0
			? specRates.map((r) => ({
					meter: r.meter,
					unit: r.unit,
					amount: String(r.amount),
					aboveTokens: r.aboveTokens != null ? String(r.aboveTokens) : "",
				}))
			: [emptyRate()];
	return {
		displayName: displayLabel(pricing.metadata),
		description: pricing.metadata.description ?? "",
		host: pricing.metadata.owner?.id ?? "",
		currency: pricing.spec.currency || "USD",
		targetModels: pricing.spec.targetModels ?? [],
		rates,
	};
}

interface UsePricingFormOptions {
	pricing?: Pricing;
	prefill?: PricingPrefill;
	onSaved: (name: string) => void;
}

export function usePricingForm({
	pricing,
	prefill,
	onSaved,
}: UsePricingFormOptions) {
	const isEdit = pricing !== undefined;
	const createPricing = useCreatePricing();
	const updatePricing = useUpdatePricing();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		pricing?.metadata.id ?? "",
		pricing?.metadata.resourceVersion,
	);

	// The prefill only seeds a new form; later changes mustn't reset it.
	const prefillRef = useRef(prefill);
	const initial = useMemo<PricingFormValues>(
		() =>
			pricing ? pricingToValues(pricing) : emptyValues(prefillRef.current),
		[pricing],
	);
	const suffixRef = useRef<string>(
		pricing?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "pricing";
		return `${base}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<PricingFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const rates: PricingRate[] = value.rates.map((r) => ({
				meter: r.meter,
				unit: r.unit,
				amount: Number(r.amount),
				...(r.aboveTokens !== "" ? { aboveTokens: Number(r.aboveTokens) } : {}),
			}));
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = {
				currency: value.currency.trim().toUpperCase(),
				rates,
				targetModels: value.targetModels,
			};
			// The relay requires pricing rows to be host-owned (rate sheets
			// belong to the billing host).
			const owner: Owner = { kind: "host", id: value.host };
			try {
				const name = computeSlug(displayName);
				if (isEdit && pricing) {
					const payload: PricingUpdate = {
						metadata: {
							...pricing.metadata,
							resourceVersion: loaded.version,
							name,
							displayName,
							owner,
							...(description
								? { description }
								: pricing.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: { ...spec, enabled: pricing.spec.enabled },
					};
					const saved = await updatePricing.mutateAsync({
						id: pricing.metadata.id ?? "",
						body: payload,
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Pricing "${displayName}" updated.`);
				} else {
					const payload: PricingCreate = {
						metadata: {
							name,
							displayName,
							owner,
							...(description ? { description } : {}),
						},
						spec: { ...spec, enabled: true },
					};
					await createPricing.mutateAsync(payload);
					toast("success", `Pricing "${displayName}" created.`);
				}
				onSaved(name);
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update pricing." : "Failed to create pricing.",
					loaded.reload,
				);
			}
		},
	});

	// The draft is only replaced when the user reloads after a conflict.
	const lastResetKey = useRef(loaded.resetKey);
	useEffect(() => {
		if (lastResetKey.current === loaded.resetKey) return;
		lastResetKey.current = loaded.resetKey;
		form.reset(initial);
	}, [loaded.resetKey, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.displayName?.errors),
	);
	const currencyError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.currency?.errors),
	);
	const hostError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.host?.errors),
	);
	const targetModelsError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.targetModels?.errors),
	);
	const ratesError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.rates?.errors),
	);
	const rateErrors = useStore(form.store, (s) => {
		const meta = s.fieldMeta ?? {};
		const byIdx: Record<number, { amount?: string; aboveTokens?: string }> = {};
		for (const [key, value] of Object.entries(meta)) {
			const m = key.match(/^rates\.(\d+)\.(amount|aboveTokens)$/);
			if (!m) continue;
			const idx = Number(m[1]);
			const field = m[2] === "amount" ? "amount" : "aboveTokens";
			const e = firstError(value?.errors);
			if (e !== undefined) byIdx[idx] = { ...byIdx[idx], [field]: e };
		}
		return byIdx;
	});

	function addRate() {
		// Default the new row's meter to the first unpriced common meter.
		const used = new Set(values.rates.map((r) => r.meter));
		const meter = PRICING_METERS.find((m) => !used.has(m)) ?? "tokens.input";
		form.setFieldValue("rates", [...values.rates, emptyRate(meter)]);
	}
	function removeRate(idx: number) {
		const next = values.rates.filter((_, i) => i !== idx);
		form.setFieldValue("rates", next.length > 0 ? next : [emptyRate()]);
	}
	function updateRate(idx: number, patch: Partial<RateDraft>) {
		const next = values.rates.map((r, i) =>
			i === idx ? { ...r, ...patch } : r,
		);
		form.setFieldValue("rates", next);
	}
	function setTargetModels(ids: string[]) {
		form.setFieldValue("targetModels", ids);
	}

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		currencyError,
		hostError,
		targetModelsError,
		ratesError,
		rateErrors,
		addRate,
		removeRate,
		updateRate,
		setTargetModels,
	};
}
