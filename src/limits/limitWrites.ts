import type { BudgetSpec } from "@/api/hooks/budgets";
import type { RateLimitRule } from "@/api/types/ratelimit";
import type { components } from "@/api/types.gen";
import type { BudgetMode, BudgetPeriod } from "@/budgets/budgetFormat";
import { displayLabel } from "@/lib/displayLabel";
import type { UnpricedGrant } from "@/lib/pricingMatrix";
import {
	type OwnPolicyCase,
	type OwnPolicyWrite,
	ownPolicyWrites,
	type PolicySpecChange,
} from "@/policy-bindings/ownPolicy";
import {
	easyRateLimitRules,
	parseAmount,
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

/** The limit as its own create takes it; a rate limit also carries the models its link counts. */
export type LimitSpec =
	| { kind: "budget"; spec: BudgetSpec }
	| { kind: "rateLimit"; rules: RateLimitRule[]; models: readonly string[] };

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
		rules: easyRateLimitRules({
			[answers.meter]: {
				amount: parseAmount(answers.rateAmount),
				per: answers.per,
			},
		}),
		models: answers.models,
	};
}

/**
 * What a spend cap refuses for want of a price: the current policy's unpriced
 * models, or, with no policy yet, whatever unpriced model the target reaches.
 */
export type UnpricedWarning =
	| { kind: "none" }
	| { kind: "noPolicy" }
	| { kind: "grants"; grants: readonly UnpricedGrant[] };

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

/** What the target is under now, and what saving does to it. */
export function policyCaseLine(
	policyCase: OwnPolicyCase,
	targetLabel: string,
): string {
	switch (policyCase.kind) {
		case "create":
			return "No policy yet";
		case "above":
			return "Limited by a policy you can't see or change. Ask whoever set it.";
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
