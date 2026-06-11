/**
 * Pure math over the relay's server-computed cost fields. The relay stamps
 * each event's cost once at emit time (nano-USD, from the pricing then in
 * effect) and aggregates it onto /usage rows as `cost_nanos` plus an
 * `unpriced` event count — see pkg/usage/query.go. The FE never re-prices
 * usage; this module only folds those fields into display shapes.
 *
 * The one invariant carried over from the old FE join: traffic with no cost
 * stamp surfaces as unpriced, never as $0. A row whose every event is
 * unpriced has `cost_nanos: 0`, which must render as "—", not "$0".
 */

export const NANOS_PER_USD = 1_000_000_000;

/** Cost over some slice of traffic (a window, a group, a bucket). */
export interface CostTotal {
	/** Summed spend in USD; null when no event in the slice was priced —
	 * unpriced traffic must never collapse to $0. */
	usd: number | null;
	/** Events that carried no cost stamp (no pricing resolved, or no
	 * priceable tokens — the relay's `unpriced` counter). */
	unpricedEvents: number;
	/** Unpriced share of the slice's events, 0..1. */
	unpricedShare: number;
}

/** Fold one usage row's cost fields into a display total. */
export function costTotal(
	costNanos: number,
	unpriced: number,
	requests: number,
): CostTotal {
	const priced = requests - unpriced;
	return {
		usd: priced > 0 ? costNanos / NANOS_PER_USD : null,
		unpricedEvents: unpriced,
		unpricedShare: requests > 0 ? unpriced / requests : 0,
	};
}

/** Sum cost fields across rows (groups of one summary, buckets of one
 * series) into a single total. */
export function sumCostRows(
	rows: ReadonlyArray<{
		cost_nanos: number;
		unpriced: number;
		requests: number;
	}>,
): CostTotal {
	let nanos = 0;
	let unpriced = 0;
	let requests = 0;
	for (const r of rows) {
		nanos += r.cost_nanos;
		unpriced += r.unpriced;
		requests += r.requests;
	}
	return costTotal(nanos, unpriced, requests);
}
