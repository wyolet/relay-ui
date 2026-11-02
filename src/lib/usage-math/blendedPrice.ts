import { groupByMeter, type RateLike, unitTokens } from "./pricing";

/** Input and output token rates blend 3:1, a typical prompt-heavy mix. */
export const BLEND_WEIGHTS: Readonly<Record<string, number>> = {
	"tokens.input": 3,
	"tokens.output": 1,
};

/** A flat per-request meter; it prices a model only when no token rate does. */
export const REQUEST_METER = "requests";

/** One comparable price for a rate sheet: per 1M tokens, or per request. */
export interface BlendedPrice {
	amount: number;
	per: "1M" | "request";
	currency: string;
}

/** Base rate (lowest tier, default service tier) per meter, scaled to
 * `scale` units of it. */
function baseRates(rates: readonly RateLike[], scale: number) {
	const out = new Map<string, number>();
	for (const g of groupByMeter(rates.filter((r) => !r.serviceTier))) {
		const base = g.rates[0];
		const per = unitTokens(g.unit);
		if (base && per != null && per > 0)
			out.set(g.meter, base.amount * (scale / per));
	}
	return out;
}

/**
 * (3 × input + 1 × output) / 4 in currency per 1M tokens. A side without a
 * rate drops out of the weights (embeddings price input only); cache, audio
 * and other meters never enter. Without token rates a request rate prices it;
 * null when neither exists.
 */
export function blendedPrice(
	rates: readonly RateLike[],
	currency: string,
): BlendedPrice | null {
	const perMillion = baseRates(rates, 1_000_000);
	let weighted = 0;
	let weights = 0;
	for (const [meter, weight] of Object.entries(BLEND_WEIGHTS)) {
		const rate = perMillion.get(meter);
		if (rate == null) continue;
		weighted += weight * rate;
		weights += weight;
	}
	if (weights > 0) return { amount: weighted / weights, per: "1M", currency };
	const request = baseRates(rates, 1).get(REQUEST_METER);
	return request != null ? { amount: request, per: "request", currency } : null;
}

/** Token prices before request prices, then cheapest first; null last. */
export function compareBlendedPrices(
	a: BlendedPrice | null,
	b: BlendedPrice | null,
): number {
	if (!a || !b) return Number(!a) - Number(!b);
	if (a.per !== b.per) return a.per === "1M" ? -1 : 1;
	return a.amount - b.amount;
}

/** The lowest of several hosts' prices; `from` when the priced hosts differ. */
export function lowestBlendedPrice(
	prices: readonly (BlendedPrice | null)[],
): { price: BlendedPrice; from: boolean } | null {
	const priced = prices.filter((p): p is BlendedPrice => p != null);
	const [price] = [...priced].sort(compareBlendedPrices);
	if (!price) return null;
	const from = priced.some(
		(p) =>
			p.per !== price.per ||
			p.amount !== price.amount ||
			p.currency !== price.currency,
	);
	return { price, from };
}

/** "$4.50 / 1M", "<$0.01 / 1M", "$0.02 / req"; non-USD reads "EUR 4.50". */
export function fmtBlendedPrice(price: BlendedPrice): string {
	const usd = price.currency.toUpperCase() === "USD";
	const money = (n: string) => (usd ? `$${n}` : `${price.currency} ${n}`);
	const unit = price.per === "1M" ? "1M" : "req";
	const text =
		price.amount > 0 && price.amount < 0.01
			? `<${money("0.01")}`
			: money(price.amount.toFixed(2));
	return `${text} / ${unit}`;
}
