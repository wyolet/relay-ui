import { ACCOUNT_KIND_LABELS, type AccountKind } from "@/accounts/accountView";
import type { AccountLimits } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";
import { fmtBudgetUsage, fmtRuleUsage, meterShare } from "@/lib/limitsFormat";
import { windowShort } from "@/lib/timeWindow";

type LimitsRung = components["schemas"]["LimitsRung"];
type LimitsRule = components["schemas"]["LimitsRule"];
type LimitsBudget = components["schemas"]["LimitsBudget"];
type BoundPolicy = components["schemas"]["BoundPolicy"];
type LimitsTightest = components["schemas"]["LimitsTightest"];

/** Current use against the cap; absent when the read carries no count. */
export interface MeterReading {
	usage: string;
	share: number;
}

/** One rate-limit rule or budget on a rung. */
export interface LimitMeter {
	key: string;
	kind: LimitsTightest["kind"];
	/** The rate limit's or budget's slug, for its link. */
	name: string;
	/** "requests / 1m", or "per month" for a budget. */
	measure: string;
	/** The strategy of a rule, shown on hover. */
	hint?: string;
	/** The models a rate-limit link applies to; empty applies to every request. */
	models: string[];
	reading?: MeterReading;
	shared: boolean;
	/** Counted on each member's lane, so a team or project read has no count for it. */
	perLane: boolean;
	/** An alert-mode budget only reports the overrun. */
	alertOnly: boolean;
	tightest: boolean;
}

export interface LimitsRungView {
	key: string;
	accountName: string;
	kindLabel: string;
	policy?: BoundPolicy;
	meters: LimitMeter[];
}

export interface LimitsView {
	rungs: LimitsRungView[];
	tightest?: { label: string; exhausted: boolean };
}

export type LimitsState =
	| { status: "hidden" }
	| { status: "loading" }
	| { status: "ready"; view: LimitsView };

/** A provider account's own policy caps its keys upstream; the read reports no rungs for it. */
export function hasLimitsView(kind: AccountKind): boolean {
	return kind !== "provider";
}

function isTightest(
	tightest: LimitsTightest | undefined,
	accountId: string,
	kind: LimitsTightest["kind"],
	id: string,
): boolean {
	return (
		tightest !== undefined &&
		tightest.accountId === accountId &&
		tightest.kind === kind &&
		tightest.id === id
	);
}

function ruleReading(rule: LimitsRule): MeterReading | undefined {
	if (rule.used === undefined) return undefined;
	return {
		usage: fmtRuleUsage(rule.used, rule.amount),
		share: meterShare(rule.used, rule.amount),
	};
}

function budgetReading(budget: LimitsBudget): MeterReading | undefined {
	if (budget.spentUsd === undefined) return undefined;
	return {
		usage: fmtBudgetUsage(budget.spentUsd, budget.amountUsd),
		share: meterShare(Number(budget.spentUsd), Number(budget.amountUsd)),
	};
}

function rungMeters(
	rung: LimitsRung,
	tightest: LimitsTightest | undefined,
): LimitMeter[] {
	const accountId = rung.account.id;
	const rules = (rung.rateLimits ?? []).flatMap((rl) =>
		(rl.rules ?? []).map(
			(rule, i): LimitMeter => ({
				key: `${rl.rateLimitId}-${i}`,
				kind: "rateLimit",
				name: rl.name,
				measure: `${rule.meter} / ${windowShort(rule.window)}`,
				hint: rule.strategy,
				models: rl.models ?? [],
				reading: rl.perLane ? undefined : ruleReading(rule),
				shared: rl.shared,
				perLane: rl.perLane,
				alertOnly: false,
				tightest: isTightest(tightest, accountId, "rateLimit", rl.rateLimitId),
			}),
		),
	);
	const budgets = (rung.budgets ?? []).map(
		(b): LimitMeter => ({
			key: b.budgetId,
			kind: "budget",
			name: b.name,
			measure: `per ${b.period}`,
			models: [],
			reading: b.perLane ? undefined : budgetReading(b),
			shared: b.shared,
			perLane: b.perLane,
			alertOnly: b.mode === "alert",
			tightest: isTightest(tightest, accountId, "budget", b.budgetId),
		}),
	);
	return [...rules, ...budgets];
}

export function toLimitsView(limits: AccountLimits): LimitsView {
	const { tightest } = limits;
	return {
		rungs: (limits.rungs ?? []).map((rung) => ({
			key: rung.account.id,
			accountName: rung.account.name,
			kindLabel: ACCOUNT_KIND_LABELS[rung.account.kind],
			policy: rung.policy,
			meters: rungMeters(rung, tightest),
		})),
		tightest: tightest && {
			label: tightest.label,
			exhausted: tightest.remaining <= 0,
		},
	};
}

/** A failed read hides the section: the limits are context, not the page's subject. */
export function toLimitsState(query: {
	data: AccountLimits | undefined;
	isError: boolean;
	enabled: boolean;
}): LimitsState {
	if (!query.enabled || query.isError) return { status: "hidden" };
	if (!query.data) return { status: "loading" };
	return { status: "ready", view: toLimitsView(query.data) };
}
