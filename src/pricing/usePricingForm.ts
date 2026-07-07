import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useMemo, useRef } from "react";
import { z } from "zod";
import { useCreatePricing, useUpdatePricing } from "@/api/hooks/pricings";
import { ApiError } from "@/api/types/errors";
import type {
	Pricing,
	PricingCreate,
	PricingRate,
	PricingUpdate,
} from "@/api/types/pricing";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import { PRICING_METERS } from "@/lib/usage-math/pricing";
import { toast } from "@/shared/Toast";

export type PricingMeter = (typeof PRICING_METERS)[number];

export interface RateDraft {
	meter: string;
	unit: string;
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

export function emptyRate(meter: string = "tokens.input"): RateDraft {
	return { meter, unit: "per_million", amount: "", aboveTokens: "" };
}

function emptyValues(): PricingFormValues {
	return {
		displayName: "",
		description: "",
		host: "",
		currency: "USD",
		targetModels: [],
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
	onSaved: (name: string) => void;
}

export function usePricingForm({ pricing, onSaved }: UsePricingFormOptions) {
	const isEdit = pricing !== undefined;
	const createPricing = useCreatePricing();
	const updatePricing = useUpdatePricing();

	const initial = useMemo<PricingFormValues>(
		() => (pricing ? pricingToValues(pricing) : emptyValues()),
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

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: ({ value }) => {
				const r = schema.safeParse(value);
				if (r.success) return undefined;
				const fields: Record<string, string> = {};
				for (const issue of r.error.issues) {
					const key = issue.path.join(".");
					if (key && !fields[key]) fields[key] = issue.message;
				}
				return { fields };
			},
			onChange: ({ value }) => {
				const r = schema.safeParse(value);
				if (r.success) return undefined;
				const fields: Record<string, string> = {};
				for (const issue of r.error.issues) {
					const key = issue.path.join(".");
					if (key && !fields[key]) fields[key] = issue.message;
				}
				return { fields };
			},
		},
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
			const owner = { kind: "host", id: value.host };
			try {
				const name = computeSlug(displayName);
				if (isEdit && pricing) {
					const payload: PricingUpdate = {
						metadata: {
							...pricing.metadata,
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
					await updatePricing.mutateAsync({
						id: pricing.metadata.id ?? "",
						body: payload,
					});
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
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update pricing."
							: "Failed to create pricing.",
				);
			}
		},
	});

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.displayName?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const currencyError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.currency?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const hostError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.host?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const targetModelsError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.targetModels?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const ratesError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.rates?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const rateErrors = useStore(form.store, (s) => {
		const meta = s.fieldMeta ?? {};
		const byIdx: Record<number, { amount?: string; aboveTokens?: string }> = {};
		for (const [key, value] of Object.entries(meta)) {
			const m = key.match(/^rates\.(\d+)\.(amount|aboveTokens)$/);
			if (!m) continue;
			const idx = Number(m[1]);
			const field = m[2] === "amount" ? "amount" : "aboveTokens";
			const errs = value?.errors ?? [];
			for (const e of errs) {
				if (typeof e === "string") {
					byIdx[idx] = { ...byIdx[idx], [field]: e };
					break;
				}
			}
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
