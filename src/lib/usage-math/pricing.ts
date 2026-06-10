/**
 * Pure pricing/spend math. The relay attaches pricing to model↔host bindings
 * (currency + per-meter rates) and reports usage as token-meter maps — it
 * never computes cost. This module owns the join: rates → per-token costs,
 * token maps → estimated spend, and the exact per-(model, host) cost grid the
 * usage page aggregates. Hooks fetch and feed data in; components render.
 *
 * All figures are estimates: tiered rates are applied at their base (lowest
 * tier) amount, since aggregated token sums can't replay per-request tier
 * boundaries. The UI labels every figure "≈".
 */

import { type SeriesSample, type StackedSeries, stackSamples } from "./stack";
import type { UsageInterval } from "./window";

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

// --- Currency-aware aggregation ---

export interface CurrencyAmount {
	currency: string;
	amount: number;
}

/** A cost total that refuses to sum across currencies. */
export interface CostSum {
	/** Per-currency totals, largest first. */
	totals: CurrencyAmount[];
	/** The largest currency's total; null when nothing was priced. */
	dominant: CurrencyAmount | null;
	/** True when more than one currency contributed. */
	mixed: boolean;
	/** Tokens seen on usage with no pricing attached — never shown as $0. */
	unpricedTokens: number;
}

export function summarizeCost(
	byCurrency: ReadonlyMap<string, number>,
	unpricedTokens = 0,
): CostSum {
	const totals = [...byCurrency.entries()]
		.map(([currency, amount]) => ({ currency, amount }))
		.sort((a, b) => b.amount - a.amount);
	return {
		totals,
		dominant: totals[0] ?? null,
		mixed: totals.length > 1,
		unpricedTokens,
	};
}

// --- Exact (model, host) cost grid ---

/** One (host, model) usage cell from a per-host summary query. */
export interface CostCellInput {
	hostId: string;
	modelId: string;
	requests: number;
	/** Token sums by usage meter key (`prompt`, `completion`, …). */
	tokens: Record<string, number>;
}

/** The pricing attached to one model↔host binding. */
export interface BindingPricing {
	currency: string;
	rates: RateLike[];
}

/** hostId → modelId → the binding's pricing. Built by hooks from /hosts/{ref}/models. */
export type PricingLookup = ReadonlyMap<
	string,
	ReadonlyMap<string, BindingPricing>
>;

export interface CostCell extends CostCellInput {
	/** Estimated spend, or null when the binding has no usable pricing. */
	cost: number | null;
	currency: string | null;
}

export interface UnpricedUsage {
	tokens: number;
	requests: number;
	/** Models that saw traffic on at least one unpriced binding. */
	modelIds: string[];
}

export interface CostGridResult {
	cells: CostCell[];
	total: CostSum;
	byModel: Map<string, CostSum>;
	byHost: Map<string, CostSum>;
	unpriced: UnpricedUsage;
}

function bump(map: Map<string, number>, key: string, amount: number): void {
	map.set(key, (map.get(key) ?? 0) + amount);
}

function nestedBump(
	map: Map<string, Map<string, number>>,
	outer: string,
	inner: string,
	amount: number,
): void {
	let m = map.get(outer);
	if (!m) {
		m = new Map();
		map.set(outer, m);
	}
	bump(m, inner, amount);
}

function sumValues(tokens: Record<string, number>): number {
	let total = 0;
	for (const v of Object.values(tokens)) total += v;
	return total;
}

const EMPTY_CURRENCIES: ReadonlyMap<string, number> = new Map();

/**
 * Join per-(host, model) usage cells with binding pricing. Cells without a
 * usable pricing record are kept (cost: null) and tallied under `unpriced` —
 * traffic with no rates must surface as unpriced, never as $0.
 */
export function joinCostGrid(
	cells: readonly CostCellInput[],
	lookup: PricingLookup,
): CostGridResult {
	const out: CostCell[] = [];
	const totalByCurrency = new Map<string, number>();
	const byModelCurrency = new Map<string, Map<string, number>>();
	const byHostCurrency = new Map<string, Map<string, number>>();
	const modelUnpriced = new Map<string, number>();
	const hostUnpriced = new Map<string, number>();
	const unpricedModelIds = new Set<string>();
	let unpricedTokens = 0;
	let unpricedRequests = 0;

	for (const cell of cells) {
		const pricing = lookup.get(cell.hostId)?.get(cell.modelId);
		if (!pricing || pricing.rates.length === 0) {
			out.push({ ...cell, cost: null, currency: null });
			const cellTokens = sumValues(cell.tokens);
			unpricedTokens += cellTokens;
			unpricedRequests += cell.requests;
			if (cellTokens > 0 || cell.requests > 0)
				unpricedModelIds.add(cell.modelId);
			bump(modelUnpriced, cell.modelId, cellTokens);
			bump(hostUnpriced, cell.hostId, cellTokens);
			continue;
		}
		const cost = estimatedSpend(pricing.rates, cell.tokens);
		out.push({ ...cell, cost, currency: pricing.currency });
		bump(totalByCurrency, pricing.currency, cost);
		nestedBump(byModelCurrency, cell.modelId, pricing.currency, cost);
		nestedBump(byHostCurrency, cell.hostId, pricing.currency, cost);
	}

	const byModel = new Map<string, CostSum>();
	for (const id of new Set([
		...byModelCurrency.keys(),
		...modelUnpriced.keys(),
	]))
		byModel.set(
			id,
			summarizeCost(
				byModelCurrency.get(id) ?? EMPTY_CURRENCIES,
				modelUnpriced.get(id) ?? 0,
			),
		);
	const byHost = new Map<string, CostSum>();
	for (const id of new Set([...byHostCurrency.keys(), ...hostUnpriced.keys()]))
		byHost.set(
			id,
			summarizeCost(
				byHostCurrency.get(id) ?? EMPTY_CURRENCIES,
				hostUnpriced.get(id) ?? 0,
			),
		);

	return {
		cells: out,
		total: summarizeCost(totalByCurrency, unpricedTokens),
		byModel,
		byHost,
		unpriced: {
			tokens: unpricedTokens,
			requests: unpricedRequests,
			modelIds: [...unpricedModelIds],
		},
	};
}

// --- Stacked cost timeline ---

/** One (host, model) timeseries from a per-host /usage/timeseries query. */
export interface CostSeriesRow {
	hostId: string;
	modelId: string;
	points: Array<{ bucket: string; tokens: Record<string, number> }>;
}

export type CostStackDimension = "model_id" | "host_id";

export interface CostStacked extends StackedSeries {
	/** Dominant currency across the charted spend; null when nothing priced. */
	currency: string | null;
	mixed: boolean;
	/** Traffic excluded from the $ series for lack of pricing. */
	unpriced: { tokens: number; modelIds: string[] };
}

/**
 * Per-bucket estimated spend stacked by model or host. Unpriced (model, host)
 * traffic is excluded from the series — charting it as $0 would lie — and
 * reported in `unpriced` so callers can badge it. Mixed-currency spend stacks
 * numerically and is flagged via `mixed`.
 */
export function deriveCostStacked(
	rows: readonly CostSeriesRow[],
	lookup: PricingLookup,
	dimension: CostStackDimension,
	from: string,
	to: string,
	interval: UsageInterval,
): CostStacked {
	const samples: SeriesSample[] = [];
	const byCurrency = new Map<string, number>();
	const unpricedModelIds = new Set<string>();
	let unpricedTokens = 0;

	for (const row of rows) {
		const pricing = lookup.get(row.hostId)?.get(row.modelId);
		if (!pricing || pricing.rates.length === 0) {
			for (const p of row.points) unpricedTokens += sumValues(p.tokens);
			if (row.points.length > 0) unpricedModelIds.add(row.modelId);
			continue;
		}
		const key = dimension === "model_id" ? row.modelId : row.hostId;
		for (const p of row.points) {
			const cost = estimatedSpend(pricing.rates, p.tokens);
			samples.push({ key, bucket: p.bucket, value: cost });
			bump(byCurrency, pricing.currency, cost);
		}
	}

	const { dominant, mixed } = summarizeCost(byCurrency);
	return {
		...stackSamples(samples, from, to, interval),
		currency: dominant?.currency ?? null,
		mixed,
		unpriced: { tokens: unpricedTokens, modelIds: [...unpricedModelIds] },
	};
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
