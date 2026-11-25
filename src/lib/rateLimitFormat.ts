import type { components } from "@/api/types.gen";
import { findWindowPreset } from "@/lib/timeWindow";

type RateLimitRule = components["schemas"]["RateLimitRule"];
type RateLimitMeter = RateLimitRule["meter"];
type RateLimitStrategy = NonNullable<RateLimitRule["strategy"]>;

/**
 * Compact number: "999", "1k", "1.5k", "10k", "1M", "1.2M", "1B".
 * Uses one decimal for sub-magnitudes when the integer would lose >5%.
 */
export function compactNumber(n: number): string {
	if (!Number.isFinite(n)) return String(n);
	const abs = Math.abs(n);
	if (abs < 1000) return String(n);
	const sign = n < 0 ? "-" : "";
	const units: [number, string][] = [
		[1_000_000_000, "B"],
		[1_000_000, "M"],
		[1_000, "k"],
	];
	for (const [base, suffix] of units) {
		if (abs >= base) {
			const scaled = abs / base;
			const rounded = Math.round(scaled);
			// Use one decimal when integer rounding is >5% off and value is < 100.
			const useDecimal =
				scaled < 100 && Math.abs(scaled - rounded) / scaled > 0.05;
			const out = useDecimal ? scaled.toFixed(1) : String(rounded);
			return `${sign}${out}${suffix}`;
		}
	}
	return String(n);
}

/** Single-letter window tag for the four common presets. */
const WINDOW_LETTER: Record<number, string> = {
	1: "S",
	60: "M",
	3600: "H",
	86400: "D",
};

/** A meter's unit letter (R, T, C) and the token kind it narrows to, if any. */
const METER_SHORT: Record<RateLimitMeter, { letter: string; kind?: string }> = {
	requests: { letter: "R" },
	concurrency: { letter: "C" },
	tokens: { letter: "T" },
	"tokens.input": { letter: "T", kind: "input" },
	"tokens.output": { letter: "T", kind: "output" },
	"tokens.cache_read": { letter: "T", kind: "cache read" },
	"tokens.cache_creation": { letter: "T", kind: "cache write" },
	"tokens.reasoning": { letter: "T", kind: "reasoning" },
	"tokens.server_tool_use_input": { letter: "T", kind: "tool input" },
	"tokens.server_tool_use_output": { letter: "T", kind: "tool output" },
};

/**
 * Minimal rule label: `{amount} {kind} {unit}P{window}` for the four canonical
 * windows (e.g. "1k RPM", "1.5M input TPM"); falls back to
 * `{amount} {kind} {unit}/{N}s` for custom windows.
 */
export function formatRuleShort(rule: RateLimitRule): string {
	const amount = compactNumber(rule.amount);
	const { letter, kind } = METER_SHORT[rule.meter];
	const lead = kind ? `${amount} ${kind}` : amount;
	const preset = findWindowPreset(rule.window);
	if (preset) {
		return `${lead} ${letter}P${WINDOW_LETTER[preset.value] ?? "?"}`;
	}
	return `${lead} ${letter}/${rule.window}s`;
}

/** Each rule of a rate limit in its short form. */
export function formatRulesShort(
	rules: readonly RateLimitRule[] | null | undefined,
): string[] {
	return (rules ?? []).map(formatRuleShort);
}

export const STRATEGY_OPTIONS: Record<
	RateLimitStrategy,
	{ label: string; hint: string }
> = {
	"token-bucket": {
		label: "Token bucket",
		hint: "Refills steadily; allows short bursts up to the bucket size.",
	},
	"sliding-window": {
		label: "Sliding window",
		hint: "Smooth, accurate count over a moving window — no boundary bursts.",
	},
	"fixed-window": {
		label: "Fixed window",
		hint: "Counter resets at fixed intervals. Cheapest, but allows edge bursts.",
	},
	"leaky-bucket": {
		label: "Leaky bucket",
		hint: "Constant outflow; excess requests queue or get dropped.",
	},
	"session-window": {
		label: "Session window",
		hint: "Per-session counter — resets after a quiet period.",
	},
};

export const METER_OPTIONS: Record<
	RateLimitMeter,
	{ label: string; hint: string }
> = {
	requests: { label: "Requests", hint: "One unit per API call." },
	concurrency: {
		label: "Concurrency",
		hint: "Caps in-flight requests at any moment.",
	},
	tokens: {
		label: "Tokens (all)",
		hint: "Sum of every token sub-meter.",
	},
	"tokens.input": {
		label: "Input tokens",
		hint: "Prompt tokens sent to the provider.",
	},
	"tokens.output": {
		label: "Output tokens",
		hint: "Generated completion tokens.",
	},
	"tokens.cache_read": {
		label: "Cache read tokens",
		hint: "Tokens served from prompt cache.",
	},
	"tokens.cache_creation": {
		label: "Cache write tokens",
		hint: "Tokens written into prompt cache.",
	},
	"tokens.reasoning": {
		label: "Reasoning tokens",
		hint: "Hidden reasoning / thinking tokens.",
	},
	"tokens.server_tool_use_input": {
		label: "Server tool input tokens",
		hint: "Input tokens spent on server-side tool calls.",
	},
	"tokens.server_tool_use_output": {
		label: "Server tool output tokens",
		hint: "Output tokens from server-side tool calls.",
	},
};

export function strategyLabel(
	strategy: RateLimitStrategy | undefined,
): string | undefined {
	return strategy ? STRATEGY_OPTIONS[strategy].label : undefined;
}
