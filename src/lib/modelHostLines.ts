import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";
import type {
	ModelPriceSummary,
	ModelUsage,
	PriceRow,
} from "@/lib/pricingMatrix";

type ModelHostRow = components["schemas"]["ModelHostRow"];
type HostRef = components["schemas"]["HostRef"];

/** What a host charges for the model: unknown until prices load, or a sheet. */
export type HostRates =
	| { kind: "loading" }
	| { kind: "unpriced" }
	| {
			kind: "priced";
			cells: PriceRow["cells"];
			currency: string;
			/** Priced meters beyond the shown columns. */
			extra: number;
			sheet?: string;
	  };

/** One host serving the model: how relay reaches it there, its rates and
 * the model's traffic on it. */
export interface ModelHostLine {
	host: HostRef;
	label: string;
	adapter: string;
	upstreamName?: string;
	/** Both the host and its binding route traffic. */
	enabled: boolean;
	rates: HostRates;
	/** Undefined until usage loads; zero requests when it saw none. */
	usage?: ModelUsage;
}

/**
 * The model's host bindings joined with the pricing matrix's rates and the
 * window's usage per host, busiest first. `prices` is undefined while the
 * matrix loads; a host the matrix doesn't know has no sheet either.
 */
export function modelHostLines(
	rows: readonly Pick<ModelHostRow, "host" | "binding">[],
	prices: ModelPriceSummary | undefined,
	pricesLoaded: boolean,
	usage: ReadonlyMap<string, ModelUsage> | undefined,
): ModelHostLine[] {
	const lines = rows.map((row): ModelHostLine => {
		const price = prices?.hosts.find((h) => h.host.id === row.host.id);
		let rates: HostRates = { kind: "unpriced" };
		if (!pricesLoaded) rates = { kind: "loading" };
		else if (price && !price.unpriced)
			rates = {
				kind: "priced",
				cells: price.row.cells,
				currency: price.row.currency,
				extra: price.row.extra,
				sheet: price.row.sheet?.name,
			};
		return {
			host: row.host,
			label: displayLabel(row.host),
			adapter: row.binding.adapter,
			upstreamName: row.binding.upstreamName || undefined,
			enabled: row.host.enabled && row.binding.enabled,
			rates,
			usage: usage && (usage.get(row.host.id) ?? { requests: 0, usd: null }),
		};
	});
	return lines.sort(
		(a, b) =>
			(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
			a.label.localeCompare(b.label),
	);
}
