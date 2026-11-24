import type { RateLimitRule } from "@/api/types/ratelimit";
import type {
	RateLimitMeter as CanonicalMeter,
	RateLimitStrategy,
} from "@/rate-limits/useRateLimitForm";

export type RateLimitPer = "minute" | "hour" | "day";

// The easy forms surface a subset of the canonical meters; Extract fails the
// build if either literal leaves the source enum.
export type RateLimitMeter = Extract<CanonicalMeter, "requests" | "tokens">;

export interface EasyRateLimitRule {
	amount: number;
	per: RateLimitPer;
}

/** Requests, tokens or both; each present meter becomes one rule of a single rate limit. */
export type EasyRateLimit = Partial<Record<RateLimitMeter, EasyRateLimitRule>>;

export const PER_OPTIONS: readonly { value: RateLimitPer; label: string }[] = [
	{ value: "minute", label: "minute" },
	{ value: "hour", label: "hour" },
	{ value: "day", label: "day" },
];

const PER_SECONDS: Record<RateLimitPer, number> = {
	minute: 60,
	hour: 3600,
	day: 86400,
};

const METERS: readonly RateLimitMeter[] = ["requests", "tokens"];

/** The strategy the easy forms choose for the user. */
const EASY_STRATEGY: RateLimitStrategy = "sliding-window";

/** A typed amount, "1,000" and "1 000" included; NaN when it holds no number. */
export function parseAmount(amount: string): number {
	return Number.parseInt(amount.replace(/[,_\s]/g, ""), 10);
}

/** Whether a parsed amount is one a rule can hold: a whole number of 1 or more. */
export function validAmount(amount: number): boolean {
	return Number.isFinite(amount) && amount >= 1;
}

/** The rules a rate limit gets for the easy answers, requests first. */
export function easyRateLimitRules(limit: EasyRateLimit): RateLimitRule[] {
	return METERS.flatMap((meter) => {
		const rule = limit[meter];
		return rule
			? [
					{
						amount: rule.amount,
						meter,
						strategy: EASY_STRATEGY,
						// `window` is whole seconds on the wire (see timeWindow.ts).
						window: PER_SECONDS[rule.per],
					},
				]
			: [];
	});
}
