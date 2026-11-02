import type { BudgetSpec } from "@/api/hooks/budgets";

export type BudgetPeriod = NonNullable<BudgetSpec["period"]>;
export type BudgetMode = NonNullable<BudgetSpec["mode"]>;

/** What the server applies when the spec omits them. */
export const DEFAULT_PERIOD: BudgetPeriod = "month";
export const DEFAULT_MODE: BudgetMode = "hard";

export const BUDGET_PERIODS = [
	"day",
	"week",
	"month",
] as const satisfies readonly BudgetPeriod[];

export const BUDGET_MODES = [
	"hard",
	"alert",
] as const satisfies readonly BudgetMode[];

export const PERIOD_LABELS: Record<BudgetPeriod, string> = {
	day: "Day",
	week: "Week",
	month: "Month",
};

export const MODE_LABELS: Record<BudgetMode, { label: string; hint: string }> =
	{
		hard: {
			label: "Hard",
			hint: "Refuses requests once the cap is spent (429 budget_exceeded).",
		},
		alert: {
			label: "Alert",
			hint: "Reports the overrun and lets requests through.",
		},
	};

/** The server's amountUsd shape: whole dollars, or at most two cents digits. */
export const AMOUNT_USD_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Keeps only the characters an amount can hold, so "$2,000" types as "2000". */
export function amountInput(raw: string): string {
	return raw.replace(/[^\d.]/g, "");
}
