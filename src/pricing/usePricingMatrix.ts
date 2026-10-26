import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { catalogGraphQueryOptions } from "@/api/hooks/catalog";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { pricingsListQuery } from "@/api/hooks/pricings";
import {
	usageComparisonWindows,
	usageTotalsCompareQueryOptions,
	useUsageNow,
} from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import {
	buildPricingMatrix,
	filterPricingMatrix,
	pricingCoverage,
} from "@/lib/pricingMatrix";
import { sumCostRows } from "@/lib/usage-math/cost";
import { rollingWindow } from "@/lib/usage-math/window";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtPct } from "@/usage/format";

/** Generous page size; warn (never silently truncate) past it. */
const PRICINGS_LIMIT = 500;

export const pricingGraphQuery = catalogGraphQueryOptions({
	includeDeprecated: true,
});
export const pricingsMatrixListQuery = pricingsListQuery({
	limit: PRICINGS_LIMIT,
});

/** Share of the trailing week's requests relay couldn't price; null before it
 * loads or without traffic. Not suspending: a config page must not wait on,
 * or fail with, the usage store. */
function useUnpricedShare(): number | null {
	const now = useUsageNow();
	const win = { ...rollingWindow(now, 7 * 24), interval: "1h" as const };
	const { previous } = usageComparisonWindows(win, now);
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
	const matrix = buildPricingMatrix({
		hosts: (hosts.data.items ?? []).flatMap((h) =>
			h.metadata.id
				? [
						{
							id: h.metadata.id,
							slug: h.metadata.name,
							label: displayLabel(h.metadata),
						},
					]
				: [],
		),
		models: (models.data.items ?? []).flatMap((m) =>
			m.metadata.id
				? [
						{
							id: m.metadata.id,
							slug: m.metadata.name,
							label: displayLabel(m.metadata),
						},
					]
				: [],
		),
		bindings: (graph.data.models ?? []).flatMap((m) =>
			(m.bindings ?? []).map((b) => ({ hostId: b.hostId, modelId: m.id })),
		),
		pricings: sheets.flatMap((p) =>
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
		hosts: filterPricingMatrix(matrix, query, unpricedOnly),
		anyRows: matrix.length > 0,
		figures,
		truncated:
			pricings.data.total > sheets.length
				? { shown: sheets.length, total: pricings.data.total }
				: undefined,
	};
}
