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
	amount: number;
	meter: RateLimitMeter;
	strategy: RateLimitStrategy;
	window: number;
}

export interface RateLimitFormValues {
	name: string;
	description: string;
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

const baseSchema = z.object({
	description: z.string().trim().max(500, "Description is too long"),
	rules: z.array(ruleSchema).min(1, "At least one rule is required"),
});

const nameSchema = z
	.string()
	.trim()
	.min(1, "Name is required")
	.max(64, "Name is too long")
	.regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, digits, _ . -");

const createSchema = baseSchema.extend({ name: nameSchema });
const editSchema = baseSchema.extend({ name: nameSchema });

export function emptyRule(): RuleDraft {
	return {
		amount: 100,
		meter: "requests",
		strategy: DEFAULT_STRATEGY,
		window: 60,
	};
}

function emptyValues(): RateLimitFormValues {
	return {
		name: "",
		description: "",
		rules: [emptyRule()],
	};
}

const NS_PER_SEC = 1_000_000_000;
export const nsToSeconds = (ns: number): number => Math.round(ns / NS_PER_SEC);
export const secondsToNs = (s: number): number => Math.round(s * NS_PER_SEC);

function rlToValues(rl: RateLimit): RateLimitFormValues {
	const specRules = rl.spec.rules ?? null;
	const specWindowSec = nsToSeconds(rl.spec.window);
	const rules: RuleDraft[] =
		specRules && specRules.length > 0
			? specRules.map((r) => ({
					amount: r.amount,
					meter: r.meter,
					strategy: r.strategy ?? rl.spec.strategy ?? DEFAULT_STRATEGY,
					window:
						r.window && r.window > 0 ? nsToSeconds(r.window) : specWindowSec,
				}))
			: [emptyRule()];
	return {
		name: rl.metadata.name,
		description: rl.spec.description ?? "",
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
				meter: r.meter,
				strategy: r.strategy,
				window: secondsToNs(Number(r.window)),
			}));
			const specWindowNs = rules[0]?.window ?? secondsToNs(60);
			const description = value.description.trim();
			const spec = {
				strategy: DEFAULT_STRATEGY,
				window: specWindowNs,
				rules,
				...(description ? { description } : {}),
			};
			try {
				if (isEdit && rateLimit) {
					const payload: RateLimitUpdate = {
						metadata: { ...rateLimit.metadata, name: value.name.trim() },
						spec,
					};
					await updateRL.mutateAsync(payload);
					toast("success", `Rate limit "${value.name.trim()}" updated.`);
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
		rulesError,
		addRule,
		removeRule,
		updateRule,
	};
}
