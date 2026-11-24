import type { BudgetSpec } from "@/api/hooks/budgets";
import type { RateLimitSpec } from "@/api/types/ratelimit";
import type { components } from "@/api/types.gen";
import type { BudgetMode, BudgetPeriod } from "@/budgets/budgetFormat";
import { displayLabel } from "@/lib/displayLabel";
import type { UnpricedGrant } from "@/lib/pricingMatrix";
import { required } from "@/lib/required";
import {
	type OwnPolicyCase,
	type OwnPolicyWrite,
	ownPolicyWrites,
	type PolicySpecChange,
} from "@/policy-bindings/ownPolicy";
import {
	easyRateLimitRules,
	type RateLimitMeter,
	type RateLimitPer,
} from "@/rate-limits/easyRateLimit";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

type Owner = components["schemas"]["Owner"];

export type LimitKind = "budget" | "rateLimit";

/** The form's answers; only the fields of the picked kind are sent. */
export interface LimitAnswers {
	kind: LimitKind;
	/** "" names the limit after the target. */
	displayName: string;
	amountUsd: string;
	period: BudgetPeriod;
	mode: BudgetMode;
	rateAmount: string;
	meter: RateLimitMeter;
	per: RateLimitPer;
	/** Empty counts every model. */
	models: string[];
	perAccount: boolean;
}

/** The limit as its own create takes it. */
export type LimitSpec =
	| { kind: "budget"; spec: BudgetSpec }
	| { kind: "rateLimit"; spec: RateLimitSpec };

/** How the policy links the limit. */
export interface LimitLink {
	/** False gives each account under the target a cap or count of its own. */
	shared: boolean;
	/** The models a rate limit counts; empty counts every model. */
	models: readonly string[];
}

/** A typed rate amount as a whole number of 1 or more, "1,000" included; undefined for anything else. */
export function wholeRateAmount(raw: string): number | undefined {
	const digits = raw.replace(/[,_\s]/g, "");
	if (!/^\d+$/.test(digits)) return undefined;
	const amount = Number(digits);
	return amount >= 1 ? amount : undefined;
}

export function limitSpec(answers: LimitAnswers): LimitSpec {
	if (answers.kind === "budget") {
		return {
			kind: "budget",
			spec: {
				amountUsd: answers.amountUsd,
				period: answers.period,
				mode: answers.mode,
			},
		};
	}
	return {
		kind: "rateLimit",
		spec: {
			enabled: true,
			rules: easyRateLimitRules({
				[answers.meter]: {
					amount: required(wholeRateAmount(answers.rateAmount), "rate amount"),
					per: answers.per,
				},
			}),
		},
	};
}

/** A spend cap counts every model; one each only where accounts sit under the target. */
export function limitLink(
	answers: Pick<LimitAnswers, "kind" | "models" | "perAccount">,
	targetKind: ShortcutTargetKind,
): LimitLink {
	return {
		shared: !(hasAccountsUnder(targetKind) && answers.perAccount),
		models: answers.kind === "rateLimit" ? answers.models : [],
	};
}

/**
 * What a spend cap refuses for want of a price: the current policy's unpriced
 * models, or, with no policy yet, whatever unpriced model the target reaches.
 */
export type UnpricedWarning =
	| { kind: "none" }
	| { kind: "noPolicy" }
	| { kind: "grants"; grants: readonly UnpricedGrant[] }
	| { kind: "models"; models: readonly string[] };

/** A spend cap's unpriced models as relay's dry run lists them, provider/model each. */
export function dryRunUnpriced(
	kind: LimitKind,
	models: readonly string[] | null | undefined,
): UnpricedWarning {
	return kind === "budget" && models && models.length > 0
		? { kind: "models", models }
		: { kind: "none" };
}

export function unpricedWarning(
	kind: LimitKind,
	underPolicy: boolean,
	grants: readonly UnpricedGrant[] | null,
): UnpricedWarning {
	if (kind !== "budget") return { kind: "none" };
	if (!underPolicy) return { kind: "noPolicy" };
	return grants && grants.length > 0
		? { kind: "grants", grants }
		: { kind: "none" };
}

/** The team, project or service account a limit is for. */
export interface LimitTarget {
	kind: ShortcutTargetKind;
	id: string;
	/** Slug, for the link back to its page. */
	name: string;
	label: string;
	/** Owner of the limit and of any policy made or copied for it. */
	scope: Owner;
}

/** The scope that owns what the form makes: the target itself, or a service account's project. */
export function targetScope(
	kind: ShortcutTargetKind,
	id: string,
	projectId: string,
): Owner {
	if (kind === "serviceaccount") return { kind: "project", id: projectId };
	return { kind, id };
}

/** Whether "one for each account under it" means anything: a service account has only its own. */
export function hasAccountsUnder(kind: ShortcutTargetKind): boolean {
	return kind !== "serviceaccount";
}

/** "Platform cap", the name a limit gets when the form leaves it empty. */
export function defaultLimitName(kind: LimitKind, targetLabel: string): string {
	return kind === "budget" ? `${targetLabel} cap` : `${targetLabel} rate limit`;
}

/** Display name of a policy the form makes or copies for the target. */
export function limitPolicyName(targetLabel: string): string {
	return `${targetLabel} limits`;
}

/** The policy's spec with the budget linked after the links it already has. */
export function withBudgetLink(
	budgetId: string,
	shared: boolean,
): PolicySpecChange {
	return (spec) => ({
		...spec,
		budgets: [...(spec.budgets ?? []), { budgetId, shared }],
	});
}

/** The policy's spec with the rate limit linked after the links it already has; no models counts every model. */
export function withRateLimitLink(
	rateLimitId: string,
	models: readonly string[],
	shared: boolean,
): PolicySpecChange {
	return (spec) => ({
		...spec,
		rateLimits: [
			...(spec.rateLimits ?? []),
			{ rateLimitId, models: models.length > 0 ? [...models] : null, shared },
		],
	});
}

/** One request the form makes after Review, in order. */
export type LimitWrite =
	| OwnPolicyWrite
	| { kind: "limit"; id: string; label: string };

/** The limit row first, then the requests that link it on the policy the target is under. */
export function limitWrites(
	kind: LimitKind,
	policyCase: OwnPolicyCase,
	targetLabel: string,
): LimitWrite[] {
	if (policyCase.kind === "above") return [];
	return [
		{
			kind: "limit",
			id: "limit",
			label:
				kind === "budget" ? "Create the spend cap" : "Create the rate limit",
		},
		...ownPolicyWrites(policyCase, targetLabel),
	];
}

export const HELD_ABOVE_LINE =
	"Limited by a policy you can't see or change. Ask whoever set it.";

/** What the target is under now, and what saving does to it. */
export function policyCaseLine(
	policyCase: OwnPolicyCase,
	targetLabel: string,
): string {
	switch (policyCase.kind) {
		case "create":
			return "No policy yet";
		case "above":
			return HELD_ABOVE_LINE;
		case "update":
			return `Policy ${displayLabel(policyCase.policy.metadata)}`;
		case "copy": {
			const name = displayLabel(policyCase.policy.metadata);
			const copy = `saving makes a copy for ${targetLabel}`;
			const n = policyCase.otherAccounts;
			if (n > 0) {
				return `Policy ${name}, shared with ${n} other account${n === 1 ? "" : "s"}: ${copy}`;
			}
			return policyCase.policy.metadata.owner?.kind === "host"
				? `Policy ${name}, a provider preset: ${copy}`
				: `Policy ${name}, owned elsewhere: ${copy}`;
		}
	}
}

/** What saving does to the target's policy, as relay's one-request answer names it. */
export type SavedPolicyCase =
	components["schemas"]["PseudoLimitsAnswer"]["case"];

/** The chain's case in relay's terms; a policy set above is never saved to. */
export function savedPolicyCase(policyCase: OwnPolicyCase): SavedPolicyCase {
	switch (policyCase.kind) {
		case "create":
			return "none";
		case "update":
			return "own";
		case "copy":
			return "copy";
		case "above":
			throw new Error("a policy set above the caller is never saved to");
	}
}

/** What saving did to the policy, for the done screen. */
export function savedCaseLine(
	policyCase: SavedPolicyCase,
	targetLabel: string,
): string {
	switch (policyCase) {
		case "none":
			return "Made a policy";
		case "own":
			return "Added to its policy";
		case "copy":
			return `Made a copy of the shared policy for ${targetLabel}`;
	}
}

/** What the target is under now, from relay's case and current policy, and what saving does to it. */
export function currentCaseLine(
	policyCase: SavedPolicyCase,
	policyLabel: string | undefined,
	targetLabel: string,
): string {
	if (policyCase === "none" || policyLabel === undefined)
		return "No policy yet";
	if (policyCase === "own") return `Policy ${policyLabel}`;
	return `Policy ${policyLabel}, shared with other accounts or owned elsewhere: saving makes a copy for ${targetLabel}`;
}
