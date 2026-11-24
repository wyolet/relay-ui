import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { z } from "zod";
import {
	AMOUNT_USD_PATTERN,
	amountInput,
	DEFAULT_MODE,
	DEFAULT_PERIOD,
} from "@/budgets/budgetFormat";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import {
	defaultLimitName,
	hasAccountsUnder,
	type LimitAnswers,
	type LimitTarget,
	limitSpec,
	limitWrites,
	policyCaseLine,
	unpricedWarning,
} from "@/limits/limitWrites";
import { useLimitWrites } from "@/limits/useLimitWrites";
import { usePolicyUnpricedGrants } from "@/policies/usePolicyUnpricedModels";
import type { OwnPolicyCase } from "@/policy-bindings/ownPolicy";
import { parseAmount, validAmount } from "@/rate-limits/easyRateLimit";

export const LIMIT_FORM_STEPS = ["limit", "review"] as const;
export type LimitFormStep = (typeof LIMIT_FORM_STEPS)[number];

const FIELD_STEP = {
	displayName: "limit",
	amountUsd: "limit",
	rateAmount: "limit",
} as const satisfies Partial<Record<keyof LimitAnswers, LimitFormStep>>;

const schema = z
	.object({
		kind: z.enum(["budget", "rateLimit"]),
		displayName: z.string().trim().max(120, "The name is too long."),
		amountUsd: z.string(),
		rateAmount: z.string(),
	})
	.superRefine((v, ctx) => {
		if (v.kind === "budget" && !AMOUNT_USD_PATTERN.test(v.amountUsd)) {
			ctx.addIssue({
				code: "custom",
				path: ["amountUsd"],
				message: v.amountUsd
					? "Whole dollars or up to two decimals, such as 2000 or 49.50."
					: "Enter the cap in USD.",
			});
		}
		if (v.kind === "rateLimit" && !validAmount(parseAmount(v.rateAmount))) {
			ctx.addIssue({
				code: "custom",
				path: ["rateAmount"],
				message: "Enter a whole number of 1 or more.",
			});
		}
	});

/** The target and the policy case it is in now; a run keeps the case it started from. */
export interface LimitStart {
	target: LimitTarget;
	accountId: string;
	policyCase: OwnPolicyCase;
}

export function useAddLimitForm({ target, accountId, policyCase }: LimitStart) {
	const writes = useLimitWrites();
	const [initial] = useState<LimitAnswers>(() => ({
		kind: "budget",
		displayName: "",
		amountUsd: "",
		period: DEFAULT_PERIOD,
		mode: DEFAULT_MODE,
		rateAmount: "",
		meter: "requests",
		per: "minute",
		models: [],
		perAccount: false,
	}));
	const form = useForm({ defaultValues: initial });
	const values = useStore(form.store, (s) => s.values);

	const namePlaceholder = defaultLimitName(values.kind, target.label);
	const perAccountOffered = hasAccountsUnder(target.kind);
	const planned = limitWrites(values.kind, policyCase, target.label);
	const currentPolicy =
		policyCase.kind === "update" || policyCase.kind === "copy"
			? policyCase.policy
			: undefined;
	const unpricedGrants = usePolicyUnpricedGrants(
		currentPolicy?.metadata.name,
		values.kind === "budget" && currentPolicy !== undefined,
	);

	function addLimit() {
		void writes.start(
			{
				target,
				accountId,
				policyCase,
				displayName: values.displayName.trim() || namePlaceholder,
				limit: limitSpec(values),
				shared: !(perAccountOffered && values.perAccount),
			},
			planned,
		);
	}

	const { step, stepIndex, lastStep, errors, next, back } = useFormSteps({
		steps: LIMIT_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: stepFieldErrors(schema, values, FIELD_STEP),
		onFinish: addLimit,
	});

	return {
		form,
		values,
		errors,
		step,
		stepIndex,
		lastStep,
		next,
		back,
		target,
		/** Set above the caller, with no run of this form under way: no fields to offer. */
		heldAbove: policyCase.kind === "above" && writes.phase === "idle",
		caseLine: policyCaseLine(policyCase, target.label),
		namePlaceholder,
		perAccountOffered,
		unpriced: unpricedWarning(
			values.kind,
			currentPolicy !== undefined,
			unpricedGrants,
		),
		setAmountUsd(raw: string) {
			form.setFieldValue("amountUsd", amountInput(raw));
		},
		planned,
		writes,
	};
}
