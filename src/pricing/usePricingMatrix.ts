import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import {
	type CatalogGraphResponse,
	catalogGraphQueryOptions,
} from "@/api/hooks/catalog";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { pricingsListQuery } from "@/api/hooks/pricings";
import {
	usageComparisonWindows,
	usageTotalsCompareQueryOptions,
	useUsageNow,
} from "@/api/hooks/usage";
import type { HostListResponse } from "@/api/types/host";
import type { ModelListResponse } from "@/api/types/model";
import type { PricingListResponse } from "@/api/types/pricing";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";
import {
	buildPricingMatrix,
	filterPricingMatrix,
	type HostPrices,
	pricingCoverage,
	rankPriceRows,
} from "@/lib/pricingMatrix";
import { sumCostRows } from "@/lib/usage-math/cost";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useHostModelUsage, usePricingWindow } from "./useHostModelUsage";

type Metadata = components["schemas"]["Metadata"];

/** Generous page size; warn (never silently truncate) past it. */
const PRICINGS_LIMIT = 500;

export const pricingGraphQuery = catalogGraphQueryOptions({
	includeDeprecated: true,
});
export const pricingsMatrixListQuery = pricingsListQuery({
	limit: PRICINGS_LIMIT,
});

/** The pricing matrix from the catalog graph (bindings) and the host, model
 * and pricing lists; every price shown in the UI resolves through it. */
export function matrixFromLists(lists: {
	graph: CatalogGraphResponse;
	hosts: HostListResponse;
	models: ModelListResponse;
	pricings: PricingListResponse;
}): HostPrices[] {
	const ref = (meta: Metadata) =>
		meta.id
			? [{ id: meta.id, slug: meta.name, label: displayLabel(meta) }]
			: [];
	return buildPricingMatrix({
		hosts: (lists.hosts.items ?? []).flatMap((h) => ref(h.metadata)),
		models: (lists.models.items ?? []).flatMap((m) => ref(m.metadata)),
		bindings: (lists.graph.models ?? []).flatMap((m) =>
			(m.bindings ?? []).map((b) => ({ hostId: b.hostId, modelId: m.id })),
		),
		pricings: (lists.pricings.items ?? []).flatMap((p) =>
			p.metadata.owner?.id
				? [
						{
							name: p.metadata.name,
							label: displayLabel(p.metadata),
							hostId: p.metadata.owner.id,
							enabled: p.spec.enabled !== false,
							currency: p.spec.currency,
							targetModels: p.spec.targetModels ?? [],
							rates: p.spec.rates ?? [],
						},
					]
				: [],
		),
	});
}

/** Share of the trailing week's requests relay couldn't price; null before it
 * loads or without traffic. Not suspending: a config page must not wait on,
 * or fail with, the usage store. */
function useUnpricedShare(): number | null {
	const win = usePricingWindow();
	const { previous } = usageComparisonWindows(win, useUsageNow());
	const { data } = useQuery(usageTotalsCompareQueryOptions(win, previous));
	const rows = data?.rows ?? [];
	const requests = rows.reduce((n, r) => n + r.requests, 0);
	return requests > 0 ? sumCostRows(rows).unpricedShare : null;
}

/** Every host's models with their rates, narrowed by the page's filters, and
 * the figures that say how much of the catalog is priced. */
export function usePricingMatrix(query: string, unpricedOnly: boolean) {
	const [graph, hosts, models, pricings] = useSuspenseQueries({
		queries: [
			pricingGraphQuery,
			hostsListQueryOptions,
			modelsListQueryOptions,
			pricingsMatrixListQuery,
		],
	});
	const unpricedShare = useUnpricedShare();

	const sheets = pricings.data.items ?? [];
	const matrix = matrixFromLists({
		graph: graph.data,
		hosts: hosts.data,
		models: models.data,
		pricings: pricings.data,
	});

	const usage = useHostModelUsage(matrix.map((h) => h.host.id));
	const ranked = matrix.map((h) => ({
		...h,
		rows: rankPriceRows(h.rows, usage.get(h.host.id)),
	}));

	const { served, priced } = pricingCoverage(matrix);
	const disabled = sheets.filter((p) => p.spec.enabled === false).length;
	const figures: FigureData[] = [
		{
			key: "priced",
			label: "Bindings priced",
			value: fmtCompact(priced),
			note: `of ${fmtCompact(served)} served`,
		},
		{
			key: "unpriced",
			label: "Requests unpriced",
			value: unpricedShare != null ? fmtPct(unpricedShare) : "—",
			note: unpricedShare != null ? "last 7 days" : "no traffic last 7 days",
		},
		{
			key: "sheets",
			label: "Rate sheets",
			value: fmtCompact(sheets.length - disabled),
			note: disabled > 0 ? `${fmtCompact(disabled)} disabled` : undefined,
		},
	];

	return {
		hosts: filterPricingMatrix(ranked, query, unpricedOnly),
		filtered: query.trim() !== "" || unpricedOnly,
		anyRows: matrix.length > 0,
		figures,
		truncated:
			pricings.data.total > sheets.length
				? { shown: sheets.length, total: pricings.data.total }
				: undefined,
	};
}
