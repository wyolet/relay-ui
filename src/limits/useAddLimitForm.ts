import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useRef, useState } from "react";
import { z } from "zod";
import {
	AMOUNT_USD_PATTERN,
	amountInput,
	DEFAULT_MODE,
	DEFAULT_PERIOD,
} from "@/budgets/budgetFormat";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import { randomSuffix, slugEndingIn } from "@/lib/slug";
import type { LimitRefusalField } from "@/limits/limitRefusal";
import {
	defaultLimitName,
	dryRunUnpriced,
	hasAccountsUnder,
	type LimitAnswers,
	type LimitTarget,
	limitLink,
	limitSpec,
	limitWrites,
	policyCaseLine,
	unpricedWarning,
	wholeRateAmount,
} from "@/limits/limitWrites";
import {
	BODY_HAS_LINK,
	postsOnce,
	pseudoLimitsBody,
} from "@/limits/pseudoLimitsBody";
import { useLimitCurrent } from "@/limits/useLimitCurrent";
import { useLimitWrites } from "@/limits/useLimitWrites";
import { usePseudoLimitRun } from "@/limits/usePseudoLimitRun";
import { usePolicyUnpricedGrants } from "@/policies/usePolicyUnpricedModels";
import {
	type OwnPolicyCase,
	POLICY_SET_ABOVE_LINE,
} from "@/policy-bindings/ownPolicy";
import { warnedFields, warningMessages } from "@/pseudo/dryRun";
import { sameAnswers } from "@/pseudo/refusal";

export const LIMIT_FORM_STEPS = ["limit", "review"] as const;
export type LimitFormStep = (typeof LIMIT_FORM_STEPS)[number];

const FIELD_STEP = {
	displayName: "limit",
	amountUsd: "limit",
	rateAmount: "limit",
} as const satisfies Partial<Record<keyof LimitAnswers, LimitFormStep>> &
	Record<LimitRefusalField, LimitFormStep>;

/** The answers a refusal or warning of a field was about; it shows until one of them changes. */
const REFUSAL_INPUTS: Record<
	LimitRefusalField,
	readonly (keyof LimitAnswers)[]
> = {
	displayName: ["kind", "displayName"],
	amountUsd: ["kind", "amountUsd", "period", "mode"],
	rateAmount: ["kind", "rateAmount", "meter", "per", "models"],
};

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
		if (v.kind === "rateLimit" && wholeRateAmount(v.rateAmount) === undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["rateAmount"],
				message: "Enter a whole number, 1 or more.",
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
	const pseudo = usePseudoLimitRun<LimitAnswers>(target);
	const { refused } = pseudo;
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
	const suffix = useRef(randomSuffix());

	const namePlaceholder = defaultLimitName(values.kind, target.label);
	const perAccountOffered = hasAccountsUnder(target.kind);
	const link = limitLink(values, target.kind);
	const oneRequest = pseudo.oneRequest && postsOnce(link, BODY_HAS_LINK);
	const idle = writes.phase === "idle" && pseudo.run.phase === "idle";
	const current = useLimitCurrent(target, pseudo.oneRequest, idle);
	const planned = limitWrites(values.kind, policyCase, target.label);
	const currentPolicy =
		policyCase.kind === "update" || policyCase.kind === "copy"
			? policyCase.policy
			: undefined;
	const unpricedGrants = usePolicyUnpricedGrants(
		currentPolicy?.metadata.name,
		!oneRequest && values.kind === "budget" && currentPolicy !== undefined,
	);
	const heldAbove =
		current.status === "above" ||
		(current.status === "unknown" && policyCase.kind === "above");

	const answersErrors = stepFieldErrors(schema, values, FIELD_STEP);
	const unchangedSince = (field: LimitRefusalField, at: LimitAnswers) =>
		sameAnswers(values, at, REFUSAL_INPUTS[field]);
	const refusedField: Partial<Record<LimitRefusalField, string>> =
		refused?.refusal.kind === "field" &&
		unchangedSince(refused.refusal.field, refused.at)
			? { [refused.refusal.field]: refused.refusal.message }
			: {};
	const refusedIssues =
		refused?.refusal.kind === "issues"
			? [...new Set(refused.refusal.issues.map((i) => i.message))]
			: undefined;
	const refusal = refused?.refusal;
	const refusalMessage =
		refusal?.kind === "general" ||
		(refused?.fromDryRun && refusal?.kind === "field")
			? refusal.message
			: undefined;
	const warnedAt = pseudo.previewAt;
	// Kept out of useFormSteps' errors: a warning never holds Next or Add limit.
	const warned = warnedAt
		? warnedFields(pseudo.previewWarnings, (f) => unchangedSince(f, warnedAt))
		: {};

	function body() {
		const displayName = values.displayName.trim() || namePlaceholder;
		return pseudoLimitsBody(
			target,
			{ name: slugEndingIn(displayName, suffix.current), displayName },
			limitSpec(values),
		);
	}

	function previewLimit(entered: LimitFormStep) {
		if (!oneRequest || entered !== "review") return;
		pseudo.preview(body(), values);
	}

	function addLimit() {
		if (oneRequest) {
			void pseudo.submit(body(), values).then((refusal) => {
				if (refusal?.kind === "field") open("limit");
			});
			return;
		}
		void writes.start(
			{
				target,
				accountId,
				policyCase,
				displayName: values.displayName.trim() || namePlaceholder,
				limit: limitSpec(values),
				link,
			},
			planned,
		);
	}

	const { step, stepIndex, lastStep, errors, next, back, open } = useFormSteps({
		steps: LIMIT_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: { ...refusedField, ...answersErrors },
		onFinish: addLimit,
		onEnter: previewLimit,
	});

	return {
		form,
		values,
		errors: { ...warned, ...errors },
		step,
		stepIndex,
		lastStep,
		next,
		back,
		target,
		/** Relay hasn't said yet what the target is under. */
		currentLoading: idle && current.status === "loading",
		/** Set above the caller, with no run of this form under way: no fields to offer. */
		heldAbove: heldAbove && idle,
		/** Relay's own words on why, under the held line. */
		heldAboveMessage: current.status === "above" ? current.message : undefined,
		caseLine:
			current.status === "known"
				? current.line
				: heldAbove
					? POLICY_SET_ABOVE_LINE
					: policyCaseLine(policyCase, target.label),
		namePlaceholder,
		perAccountOffered,
		unpriced: oneRequest
			? dryRunUnpriced(values.kind, pseudo.previewAnswer?.unpricedModels)
			: unpricedWarning(
					values.kind,
					currentPolicy !== undefined,
					unpricedGrants,
				),
		setAmountUsd(raw: string) {
			form.setFieldValue("amountUsd", amountInput(raw));
		},
		oneRequest,
		planned,
		previewRows: pseudo.previewRows,
		previewLoading: pseudo.previewLoading,
		previewStale: pseudo.previewStale,
		previewWarnings: warningMessages(pseudo.previewWarnings),
		refusedIssues,
		refusalMessage,
		writes: oneRequest ? pseudo.run : writes,
		added: oneRequest ? pseudo.created : writes.added,
	};
}
