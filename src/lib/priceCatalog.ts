/**
 * The catalog read by price: models bucketed into price tiers by their
 * cheapest host, and one summary per host. Pure; the pricing page's hook
 * feeds it the matrix and usage.
 */

import {
	type BlendedPrice,
	compareBlendedPrices,
} from "@/lib/usage-math/blendedPrice";
import type {
	HostPrice,
	HostPrices,
	MatrixHost,
	MatrixModel,
	ModelPriceSummary,
	ModelUsage,
} from "./pricingMatrix";

export type PriceTierKey = "top" | "high" | "mid" | "low";

export interface PriceTier {
	key: PriceTierKey;
	label: string;
	/** Blended USD per 1M tokens the tier starts above. */
	above: number;
	range: string;
}

/** Blended (3 × input + output) / 4 USD per 1M tokens, highest first. Upper
 * bounds are inclusive, so a model priced exactly $10 stays in $$$. */
export const PRICE_TIERS: readonly PriceTier[] = [
	{ key: "top", label: "$$$$", above: 10, range: "over $10" },
	{ key: "high", label: "$$$", above: 5, range: "$5–10" },
	{ key: "mid", label: "$$", above: 1, range: "$1–5" },
	{ key: "low", label: "$", above: -1, range: "$1 or less" },
];

/** The tier of a token price in USD; null for per-request or other
 * currencies, which don't compare on this scale. */
export function priceTier(price: BlendedPrice | null): PriceTierKey | null {
	if (price?.per !== "1M" || price.currency.toUpperCase() !== "USD")
		return null;
	return PRICE_TIERS.find((t) => price.amount > t.above)?.key ?? null;
}

/** One model across the hosts serving it. */
export interface TierRow {
	model: MatrixModel;
	/** The host charging the least for it; null when no host prices it. */
	cheapest: HostPrice | null;
	hostCount: number;
	unpricedHosts: MatrixHost[];
	tier: PriceTierKey | null;
	usage?: ModelUsage;
}

/** A row per served model, tiered by its cheapest host. */
export function tierRows(
	summaries: ReadonlyMap<string, ModelPriceSummary>,
	usage: ReadonlyMap<string, ModelUsage>,
): TierRow[] {
	const rows: TierRow[] = [];
	for (const [modelId, s] of summaries) {
		const first = s.hosts[0];
		if (!first) continue;
		const priced = s.hosts.filter((h) => h.row.blended != null);
		const cheapest =
			[...priced].sort((a, b) =>
				compareBlendedPrices(a.row.blended, b.row.blended),
			)[0] ?? null;
		rows.push({
			model: first.row.model,
			cheapest,
			hostCount: s.hosts.length,
			unpricedHosts: s.unpricedHosts,
			tier: priceTier(cheapest?.row.blended ?? null),
			usage: usage.get(modelId),
		});
	}
	return rows;
}

export type TierTab = PriceTierKey | "unpriced";

/** Your spend first, then requests, then the newest release, then name: old
 * models that kept a launch price sink below current ones. */
function byInterest(a: TierRow, b: TierRow): number {
	return (
		(b.usage?.usd ?? 0) - (a.usage?.usd ?? 0) ||
		(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
		(b.model.releaseDate ?? "").localeCompare(a.model.releaseDate ?? "") ||
		a.model.label.localeCompare(b.model.label)
	);
}

export type TierSort = "spend" | "newest" | "price" | "name";

/** Each sort's ascending order; ties fall back to {@link byInterest}. */
const TIER_ORDER: Record<TierSort, (a: TierRow, b: TierRow) => number> = {
	spend: (a, b) => -byInterest(a, b),
	newest: (a, b) =>
		(a.model.releaseDate ?? "").localeCompare(b.model.releaseDate ?? ""),
	price: (a, b) =>
		(a.cheapest?.row.blended?.amount ?? Number.POSITIVE_INFINITY) -
		(b.cheapest?.row.blended?.amount ?? Number.POSITIVE_INFINITY),
	name: (a, b) => a.model.label.localeCompare(b.model.label),
};

/** The rows a tab lists. `unpriced` holds every model some host serves
 * without a price, whatever its tier on the others. Default order: your
 * spend, then the newest release. */
export function rowsForTab(
	rows: readonly TierRow[],
	tab: TierTab,
	showDeprecated: boolean,
	sort: { key: TierSort; dir: "asc" | "desc" } = { key: "spend", dir: "desc" },
): TierRow[] {
	const sign = sort.dir === "asc" ? 1 : -1;
	return rows
		.filter((r) => showDeprecated || !r.model.deprecated)
		.filter((r) =>
			tab === "unpriced" ? r.unpricedHosts.length > 0 : r.tier === tab,
		)
		.sort((a, b) => sign * TIER_ORDER[sort.key](a, b) || byInterest(a, b));
}

/** One host's place in the catalog. */
export interface HostCard {
	host: MatrixHost;
	/** Models it serves. */
	models: number;
	unpriced: number;
	/** Cheapest and dearest blended USD per 1M across its priced models. */
	range: { min: number; max: number } | null;
	usage?: ModelUsage;
}

/** A card per host serving anything: busiest first, then the biggest
 * catalogs, then by name. */
export function hostCards(
	matrix: readonly HostPrices[],
	usage: ReadonlyMap<string, ModelUsage>,
): HostCard[] {
	return matrix
		.map(({ host, rows, unpriced }) => {
			const served = rows.filter((r) => r.served);
			const amounts = served
				.map((r) => r.blended)
				.filter((p) => priceTier(p ?? null) != null)
				.map((p) => p?.amount ?? 0);
			return {
				host,
				models: served.length,
				unpriced,
				range:
					amounts.length > 0
						? { min: Math.min(...amounts), max: Math.max(...amounts) }
						: null,
				usage: usage.get(host.id),
			};
		})
		.filter((c) => c.models > 0)
		.sort(
			(a, b) =>
				(b.usage?.usd ?? 0) - (a.usage?.usd ?? 0) ||
				(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
				b.models - a.models ||
				a.host.label.localeCompare(b.host.label),
		);
}
