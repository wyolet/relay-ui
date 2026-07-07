import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useMemo, useRef } from "react";
import { z } from "zod";
import {
	useCreateRateLimit,
	useSystemRateLimits,
	useUpdateRateLimit,
} from "@/api/hooks/ratelimits";
import { useProxyMode } from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitRule,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import { displayLabel } from "@/lib/displayLabel";
import {
	type SystemReqCap,
	tightestRequestCap,
	validateRequestRate,
} from "@/lib/rateLimitValidation";
import { randomSuffix, slugify } from "@/lib/slug";
import { WINDOW_PRESETS } from "@/lib/timeWindow";
import { toast } from "@/shared/Toast";

export type RateLimitStrategy = NonNullable<RateLimitRule["strategy"]>;
export type RateLimitMeter = RateLimitRule["meter"];

export const STRATEGY_VALUES: readonly RateLimitStrategy[] = [
	"token-bucket",
	"sliding-window",
	"fixed-window",
	"leaky-bucket",
	"session-window",
] as const;

export const METER_VALUES: readonly RateLimitMeter[] = [
	"requests",
	"concurrency",
	"tokens",
	"tokens.input",
	"tokens.output",
	"tokens.cache_read",
	"tokens.cache_creation",
	"tokens.reasoning",
	"tokens.server_tool_use_input",
	"tokens.server_tool_use_output",
] as const;

const DEFAULT_STRATEGY: RateLimitStrategy = "token-bucket";

export interface RuleDraft {
	amount: string;
	meter: RateLimitMeter;
	strategy: RateLimitStrategy;
	window: string;
	/** Whether the window is edited as free-form seconds vs a preset. Lives on
	 * the draft (not component state) so it survives row removal/reordering. */
	isCustomWindow: boolean;
}

function isPresetWindow(window: string): boolean {
	return WINDOW_PRESETS.some((p) => String(p.value) === window);
}

export interface RateLimitFormValues {
	displayName: string;
	description: string;
	enabled: boolean;
	rules: RuleDraft[];
}

const ruleSchema = z.object({
	amount: z.coerce
		.number()
		.int("Whole numbers only")
		.min(1, "Amount must be at least 1"),
	meter: z.enum(METER_VALUES as readonly [RateLimitMeter, ...RateLimitMeter[]]),
	strategy: z.enum(
		STRATEGY_VALUES as readonly [RateLimitStrategy, ...RateLimitStrategy[]],
	),
	window: z.coerce
		.number()
		.int("Whole seconds only")
		.min(1, "Window must be at least 1"),
});

function buildSchema(tightest: SystemReqCap | undefined) {
	return z
		.object({
			displayName: z
				.string()
				.trim()
				.min(1, "Display name is required — the slug is generated from it")
				.max(120, "Display name is too long"),
			description: z.string().trim().max(500, "Description is too long"),
			enabled: z.boolean(),
			rules: z.array(ruleSchema).min(1, "At least one rule is required"),
		})
		.superRefine((val, ctx) => {
			if (!tightest) return;
			val.rules.forEach((r, idx) => {
				if (r.meter !== "requests") return;
				const msg = validateRequestRate(r.amount, r.window, tightest);
				if (msg) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["rules", idx, "amount"],
						message: msg,
					});
				}
			});
		});
}

export function emptyRule(): RuleDraft {
	return {
		amount: "100",
		meter: "requests",
		strategy: DEFAULT_STRATEGY,
		window: "60",
		isCustomWindow: false,
	};
}

function emptyValues(): RateLimitFormValues {
	return {
		displayName: "",
		description: "",
		enabled: true,
		rules: [emptyRule()],
	};
}

function rlToValues(rl: RateLimit): RateLimitFormValues {
	const specRules = rl.spec.rules ?? null;
	const rules: RuleDraft[] =
		specRules && specRules.length > 0
			? specRules.map((r) => ({
					amount: String(r.amount),
					meter: r.meter,
					strategy: r.strategy,
					window: String(r.window),
					isCustomWindow: !isPresetWindow(String(r.window)),
				}))
			: [emptyRule()];
	return {
		displayName: displayLabel(rl.metadata),
		description: rl.metadata.description ?? "",
		enabled: rl.spec.enabled ?? true,
		rules,
	};
}

interface UseRateLimitFormOptions {
	rateLimit?: RateLimit;
	onSaved: () => void;
}

export function useRateLimitForm({
	rateLimit,
	onSaved,
}: UseRateLimitFormOptions) {
	const isEdit = rateLimit !== undefined;
	const createRL = useCreateRateLimit();
	const updateRL = useUpdateRateLimit();
	const systemRLs = useSystemRateLimits();
	const { data: proxyEnvelope } = useProxyMode();
	const proxyCtx = proxyEnvelope.value;
	const tightestCap = useMemo(
		() =>
			tightestRequestCap(systemRLs, {
				proxyEnabled: proxyCtx.enabled,
				proxyAllowUnauthenticated: proxyCtx.allowUnauthenticated,
			}),
		[systemRLs, proxyCtx.enabled, proxyCtx.allowUnauthenticated],
	);
	const schema = useMemo(() => buildSchema(tightestCap), [tightestCap]);

	const initial = useMemo<RateLimitFormValues>(
		() => (rateLimit ? rlToValues(rateLimit) : emptyValues()),
		[rateLimit],
	);
	const suffixRef = useRef<string>(
		rateLimit?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "ratelimit";
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
			const rules: RateLimitRule[] = value.rules.map((r) => ({
				amount: Number(r.amount),
				meter: r.meter,
				strategy: r.strategy,
				window: Number(r.window),
			}));
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = { rules, enabled: value.enabled };
			try {
				const name = computeSlug(displayName);
				if (isEdit && rateLimit) {
					const payload: RateLimitUpdate = {
						metadata: {
							...rateLimit.metadata,
							name,
							displayName,
							...(description
								? { description }
								: rateLimit.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec,
					};
					await updateRL.mutateAsync({
						id: rateLimit.metadata.id ?? "",
						body: payload,
					});
					toast("success", `Rate limit "${displayName}" updated.`);
				} else {
					const payload: RateLimitCreate = {
						metadata: {
							name,
							displayName,
							owner: { kind: "user" },
							...(description ? { description } : {}),
						},
						spec,
					};
					await createRL.mutateAsync(payload);
					toast("success", `Rate limit "${displayName}" created.`);
				}
				onSaved();
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update rate limit."
							: "Failed to create rate limit.",
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
	const rulesError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.rules?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const ruleErrors = useStore(form.store, (s) => {
		const meta = s.fieldMeta ?? {};
		const byIdx: Record<number, { amount?: string; window?: string }> = {};
		for (const [key, value] of Object.entries(meta)) {
			const m = key.match(/^rules\.(\d+)\.(amount|window)$/);
			if (!m) continue;
			const idx = Number(m[1]);
			const field = m[2] as "amount" | "window";
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

	function addRule() {
		form.setFieldValue("rules", [...values.rules, emptyRule()]);
	}
	function removeRule(idx: number) {
		const next = values.rules.filter((_, i) => i !== idx);
		form.setFieldValue("rules", next.length > 0 ? next : [emptyRule()]);
	}
	function updateRule(idx: number, patch: Partial<RuleDraft>) {
		const next = values.rules.map((r, i) =>
			i === idx ? { ...r, ...patch } : r,
		);
		form.setFieldValue("rules", next);
	}

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		rulesError,
		ruleErrors,
		addRule,
		removeRule,
		updateRule,
	};
}
