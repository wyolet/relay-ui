/**
 * Pure token-meter math. The relay reports tokens as a per-request map of
 * meter name → count (meter names vary by model/provider: "prompt",
 * "completion", "cache_read", "reasoning", …). This module merges those maps
 * and classifies meters into input/output buckets — the split that matters
 * for cost, since output tokens price several times higher than input.
 */

export type TokenKind = "input" | "output" | "other";

export interface MeterTotal {
	meter: string;
	count: number;
	kind: TokenKind;
}

export interface TokenSplit {
	input: number;
	output: number;
	other: number;
	total: number;
	/** Cache meters (cache_read, cache_creation, …), already counted inside
	 * `input` — they bill on the input side but aren't freshly processed
	 * text. `input - cached` is the raw prompt volume. */
	cached: number;
	/** Per-meter totals, largest first. */
	meters: MeterTotal[];
}

/** Meter-name heuristics; ordered, first match wins. Input-side includes
 * cache meters — cached tokens are billed on the input side. */
const METER_KINDS: Array<[RegExp, TokenKind]> = [
	[/prompt|input|cache/i, "input"],
	[/completion|output|reasoning/i, "output"],
];

export function classifyMeter(meter: string): TokenKind {
	for (const [pattern, kind] of METER_KINDS) {
		if (pattern.test(meter)) return kind;
	}
	return "other";
}

/** Sum a list of meter maps (e.g. one per summary row) into one. */
export function mergeMeters(
	maps: Array<Record<string, number> | undefined>,
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const map of maps) {
		if (!map) continue;
		for (const [meter, count] of Object.entries(map)) {
			out[meter] = (out[meter] ?? 0) + count;
		}
	}
	return out;
}

export function splitTokens(tokens: Record<string, number>): TokenSplit {
	const meters: MeterTotal[] = Object.entries(tokens)
		.map(([meter, count]) => ({ meter, count, kind: classifyMeter(meter) }))
		.sort((a, b) => b.count - a.count);

	let input = 0;
	let output = 0;
	let other = 0;
	let cached = 0;
	for (const m of meters) {
		if (m.kind === "input") {
			input += m.count;
			if (/cache/i.test(m.meter)) cached += m.count;
		} else if (m.kind === "output") output += m.count;
		else other += m.count;
	}
	return { input, output, other, total: input + output + other, cached, meters };
}
