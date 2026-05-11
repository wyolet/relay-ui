import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { z } from "zod";
import { useCreateRateLimit, useUpdateRateLimit } from "@/api/hooks/ratelimits";
import { ApiError } from "@/api/types/errors";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitRule,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import { toast } from "@/components/Toast";

export type RateLimitStrategy =
	| "fixed-window"
	| "sliding-window"
	| "token-bucket";

export interface RuleDraft {
	amount: number;
	meter: string;
	source: string;
}

export interface RateLimitFormValues {
	name: string;
	strategy: RateLimitStrategy;
	window: number;
	rules: RuleDraft[];
}

const STRATEGY_VALUES = [
	"fixed-window",
	"sliding-window",
	"token-bucket",
] as const;

const ruleSchema = z.object({
	amount: z.coerce
		.number()
		.int("Whole numbers only")
		.positive("Amount must be > 0"),
	meter: z.string().trim().min(1, "Meter is required"),
	source: z.string().trim(),
});

const baseSchema = z.object({
	strategy: z.enum(STRATEGY_VALUES),
	window: z.coerce
		.number()
		.int("Whole seconds only")
		.positive("Window must be > 0"),
	rules: z.array(ruleSchema).min(1, "At least one rule is required"),
});

const createSchema = baseSchema.extend({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(64, "Name is too long")
		.regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, digits, _ . -"),
});

const editSchema = baseSchema.extend({ name: z.string() });

export function emptyRule(): RuleDraft {
	return { amount: 100, meter: "requests", source: "global" };
}

function emptyValues(): RateLimitFormValues {
	return {
		name: "",
		strategy: "fixed-window",
		window: 60,
		rules: [emptyRule()],
	};
}

const NS_PER_SEC = 1_000_000_000;
export const nsToSeconds = (ns: number): number => Math.round(ns / NS_PER_SEC);
export const secondsToNs = (s: number): number => Math.round(s * NS_PER_SEC);

function rlToValues(rl: RateLimit): RateLimitFormValues {
	const strategy = (STRATEGY_VALUES as readonly string[]).includes(
		rl.spec.strategy,
	)
		? (rl.spec.strategy as RateLimitStrategy)
		: "fixed-window";
	const specRules = rl.spec.rules ?? null;
	const rules: RuleDraft[] =
		specRules && specRules.length > 0
			? specRules.map((r) => ({
					amount: r.amount,
					meter: r.meter,
					source: "",
				}))
			: [emptyRule()];
	return {
		name: rl.metadata.name,
		strategy,
		window: nsToSeconds(rl.spec.window),
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
	const updateRL = useUpdateRateLimit(rateLimit?.metadata.id ?? "");

	const initial = useMemo<RateLimitFormValues>(
		() => (rateLimit ? rlToValues(rateLimit) : emptyValues()),
		[rateLimit],
	);
	const schema = isEdit ? editSchema : createSchema;

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
		},
		onSubmit: async ({ value }) => {
			const rules: RateLimitRule[] = value.rules.map((r) => ({
				amount: Number(r.amount),
				meter: r.meter.trim(),
				...(r.source.trim() ? { source: r.source.trim() } : {}),
			}));
			const spec = {
				strategy: value.strategy,
				window: secondsToNs(Number(value.window)),
				rules,
			};
			try {
				if (isEdit && rateLimit) {
					const payload: RateLimitUpdate = {
						metadata: rateLimit.metadata,
						spec,
					};
					await updateRL.mutateAsync(payload);
					toast("success", `Rate limit "${rateLimit.metadata.name}" updated.`);
				} else {
					const payload: RateLimitCreate = {
						metadata: { name: value.name.trim() },
						spec,
					};
					await createRL.mutateAsync(payload);
					toast("success", `Rate limit "${payload.metadata.name}" created.`);
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
	const nameError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.name?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const windowError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.window?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const rulesError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.rules?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
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
		nameError,
		windowError,
		rulesError,
		addRule,
		removeRule,
		updateRule,
	};
}
