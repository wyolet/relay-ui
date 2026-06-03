import type { components } from "@/api/types.gen";
import { findWindowPreset } from "@/lib/timeWindow";

type RateLimitRule = components["schemas"]["RateLimitRule"];

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

/**
 * Short token for a meter:
 *   requests           → "R"   (combines into RPM/RPS/RPH/RPD)
 *   tokens             → "T"
 *   concurrency        → "C"
 *   tokens.input       → "Tin"
 *   tokens.output      → "Tout"
 *   tokens.cache_read  → "Tcr"
 *   etc.
 */
function meterShort(meter: string): string {
	switch (meter) {
		case "requests":
			return "R";
		case "concurrency":
			return "C";
		case "tokens":
			return "T";
		case "tokens.input":
			return "Tin";
		case "tokens.output":
			return "Tout";
		case "tokens.cache_read":
			return "Tcr";
		case "tokens.cache_creation":
			return "Tcc";
		case "tokens.reasoning":
			return "Trsn";
		case "tokens.server_tool_use_input":
			return "Tsti";
		case "tokens.server_tool_use_output":
			return "Tsto";
		default:
			return meter;
	}
}

/**
 * Minimal rule label: `{amount}{meter}P{window}` for the four canonical
 * windows (e.g. "1k RPM", "10k TPS"); falls back to `{amount} {meter}/{N}s`
 * for custom windows.
 */
export function formatRuleShort(rule: RateLimitRule): string {
	const amount = compactNumber(rule.amount);
	const meter = meterShort(rule.meter);
	const seconds = rule.window;
	const preset = findWindowPreset(seconds);
	if (preset) {
		const w = WINDOW_LETTER[preset.value] ?? "?";
		return `${amount} ${meter}P${w}`;
	}
	return `${amount} ${meter}/${seconds}s`;
}

/**
 * One-liner summary of every rule on a rate limit, joined with " · ".
 * Returns "no rules" for an empty list.
 */
export function formatRulesShort(
	rules: readonly RateLimitRule[] | null | undefined,
): string {
	if (!rules || rules.length === 0) return "no rules";
	return rules.map(formatRuleShort).join(" · ");
}
