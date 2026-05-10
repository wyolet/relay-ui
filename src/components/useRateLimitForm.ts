import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useCreateRateLimit, useUpdateRateLimit } from "@/api/hooks/ratelimits";
import { ApiError } from "@/api/types/errors";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import { toast } from "@/components/Toast";

export type RateLimitStrategy =
	| "fixed_window"
	| "sliding_window"
	| "token_bucket";

export type RateLimitSource = "ip" | "api_key" | "user" | "global";

export interface RateLimitFormValues {
	name: string;
	strategy: RateLimitStrategy;
	window: number;
	amount: number;
	source: RateLimitSource;
}

const STRATEGY_VALUES = [
	"fixed_window",
	"sliding_window",
	"token_bucket",
] as const;
const SOURCE_VALUES = ["ip", "api_key", "user", "global"] as const;

const baseSchema = z.object({
	strategy: z.enum(STRATEGY_VALUES),
	window: z.coerce
		.number()
		.int("Whole seconds only")
		.positive("Window must be > 0"),
	amount: z.coerce
		.number()
		.int("Whole numbers only")
		.positive("Amount must be > 0"),
	source: z.enum(SOURCE_VALUES),
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

function emptyValues(): RateLimitFormValues {
	return {
		name: "",
		strategy: "fixed_window",
		window: 60,
		amount: 100,
		source: "global",
	};
}

function rlToValues(rl: RateLimit): RateLimitFormValues {
	const strategy = STRATEGY_VALUES.includes(
		rl.spec.strategy as RateLimitStrategy,
	)
		? (rl.spec.strategy as RateLimitStrategy)
		: "fixed_window";
	const source =
		rl.spec.source && SOURCE_VALUES.includes(rl.spec.source as RateLimitSource)
			? (rl.spec.source as RateLimitSource)
			: "global";
	return {
		name: rl.metadata.name,
		strategy,
		window: rl.spec.window,
		amount: rl.spec.amount ?? 0,
		source,
	};
}

interface UseRateLimitFormOptions {
	open: boolean;
	rateLimit?: RateLimit;
	onSaved: () => void;
}

export function useRateLimitForm({
	open,
	rateLimit,
	onSaved,
}: UseRateLimitFormOptions) {
	const isEdit = rateLimit !== undefined;
	const createRL = useCreateRateLimit();
	const updateRL = useUpdateRateLimit(rateLimit?.metadata.name ?? "");

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
					const p = issue.path[0];
					if (typeof p === "string" && !fields[p]) fields[p] = issue.message;
				}
				return { fields };
			},
		},
		onSubmit: async ({ value }) => {
			const spec = {
				strategy: value.strategy,
				window: Number(value.window),
				amount: Number(value.amount),
				source: value.source,
			};
			try {
				if (isEdit && rateLimit) {
					const payload: RateLimitUpdate = {
						metadata: rateLimit.metadata,
						spec: { ...rateLimit.spec, ...spec },
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

	useEffect(() => {
		if (open) form.reset(initial);
		else form.reset(emptyValues());
	}, [open, initial, form]);

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
	const amountError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.amount?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});

	return { form, values, isEdit, nameError, windowError, amountError };
}
