/**
 * Pure rate-sheet math for the pricing CRUD pages and binding tables: rates →
 * per-token costs, example-request blends, and one-line rate summaries.
 *
 * Spend over USAGE is no longer computed here — the relay stamps each event's
 * cost at emit time and aggregates `cost_nanos` onto /usage rows; see
 * lib/usage-math/cost.ts for that side. What remains below prices
 * hypothetical token counts against a rate sheet for display (e.g. the
 * "per 1K-token request" column), where tiered rates are applied at their
 * base (lowest tier) amount and the UI labels every figure "≈".
 */

/** Structural rate shape — both schema types `Rate` and `PricingRate` satisfy it. */
export interface RateLike {
	meter: string;
	unit: string;
	amount: number;
	aboveTokens?: number;
}

/** One meter's rates, base first then ascending tiers. */
export interface MeterGroup<R extends RateLike = RateLike> {
	meter: string;
	unit: string;
	rates: R[];
}

/**
 * The relay's closed meter set (app/pricing/pricing.go), in display order.
 * Meters carry a "tokens." prefix; usage token maps use the bare key — the
 * Go side maps them via MeterForUsageKey, mirrored here by tokenKeyForMeter.
 */
export const PRICING_METERS = [
	"tokens.input",
	"tokens.output",
	"tokens.cache_read",
	"tokens.cache_creation",
	"tokens.reasoning",
	"tokens.audio_input",
	"tokens.audio_output",
	"tokens.accepted_prediction",
	"tokens.rejected_prediction",
	"tokens.server_tool_use_input",
	"tokens.server_tool_use_output",
] as const;

/** How a rate's amount is interpreted (relay's closed Unit enum):
 * per_million = amount per 1M tokens; per_unit = amount per single token/item. */
export const PRICING_UNITS = ["per_million", "per_unit"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

/** Pricing meter → usage token-map key: inverse of the relay's
 * MeterForUsageKey ("tokens.input" → "input"). Unknown meters pass through. */
export function tokenKeyForMeter(meter: string): string {
	return meter.startsWith("tokens.") ? meter.slice("tokens.".length) : meter;
}

/** Tokens one amount-unit covers; null for units we can't price honestly. */
export function unitTokens(unit: string): number | null {
	if (unit === "per_million") return 1_000_000;
	if (unit === "per_unit") return 1;
	return null;
}

/** A representative 1K-token request, split like a typical input:output mix. */
export const EXAMPLE_PROMPT_TOKENS = 800;
export const EXAMPLE_COMPLETION_TOKENS = 200;

/** Group rates by meter (preserving first-seen order), tiers sorted ascending. */
export function groupByMeter<R extends RateLike>(
	rates: readonly R[],
): MeterGroup<R>[] {
	const order: string[] = [];
	const byMeter = new Map<string, MeterGroup<R>>();
	for (const r of rates) {
		let g = byMeter.get(r.meter);
		if (!g) {
			g = { meter: r.meter, unit: r.unit, rates: [] };
			byMeter.set(r.meter, g);
			order.push(r.meter);
		}
		g.rates.push(r);
	}
	for (const g of byMeter.values())
		g.rates.sort((a, b) => (a.aboveTokens ?? 0) - (b.aboveTokens ?? 0));
	return order.flatMap((m) => {
		const g = byMeter.get(m);
		return g ? [g] : [];
	});
}

/** Cost per single token, per meter, using each meter's base (lowest-tier)
 * rate. Meters with an unrecognized unit are skipped (mirrors the relay's
 * Cost(), which only prices its closed unit enum). */
export function costPerTokenByMeter(
	rates: readonly RateLike[],
): Map<string, number> {
	const out = new Map<string, number>();
	for (const g of groupByMeter(rates)) {
		const base = g.rates[0];
		if (!base) continue;
		const per = unitTokens(g.unit);
		if (per != null && per > 0) out.set(g.meter, base.amount / per);
	}
	return out;
}

/** Cost of an example 1K-token request, or null when there's no input rate. */
export function blendedRequestCost(rates: readonly RateLike[]): number | null {
	const cpt = costPerTokenByMeter(rates);
	const input = cpt.get("tokens.input");
	if (input == null) return null;
	const output = cpt.get("tokens.output") ?? input;
	return EXAMPLE_PROMPT_TOKENS * input + EXAMPLE_COMPLETION_TOKENS * output;
}

/** Recorded tokens × per-token rates, broken down by pricing meter. */
export function spendByMeter(
	rates: readonly RateLike[],
	tokens: Record<string, number>,
): Map<string, number> {
	const out = new Map<string, number>();
	for (const [meter, perToken] of costPerTokenByMeter(rates)) {
		const count = tokens[tokenKeyForMeter(meter)] ?? 0;
		if (count > 0) out.set(meter, count * perToken);
	}
	return out;
}

/** Recorded tokens × per-token rates, summed across meters. */
export function estimatedSpend(
	rates: readonly RateLike[],
	tokens: Record<string, number>,
): number {
	let total = 0;
	for (const amount of spendByMeter(rates, tokens).values()) total += amount;
	return total;
}

// --- Display summaries ---

export interface RateSummaryPart {
	meter: string;
	amount: number;
	unit: string;
	/** Count of tier rates above the base. */
	tiers: number;
}

/** Base rate per meter for one-line table summaries, PRICING_METERS order first. */
export function summarizeRatesParts(
	rates: readonly RateLike[],
): RateSummaryPart[] {
	const groups = groupByMeter(rates);
	const rank = (m: string) => {
		const i = (PRICING_METERS as readonly string[]).indexOf(m);
		return i === -1 ? PRICING_METERS.length : i;
	};
	return groups
		.flatMap((g) => {
			const base = g.rates[0];
			if (!base) return [];
			return [
				{
					meter: g.meter,
					amount: base.amount,
					unit: g.unit,
					tiers: g.rates.length - 1,
				},
			];
		})
		.sort((a, b) => rank(a.meter) - rank(b.meter));
}
