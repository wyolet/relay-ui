import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	usageComparisonWindows,
	usageSummaryQueryOptions,
	usageTotalsCompareQueryOptions,
	useUsageNow,
} from "@/api/hooks/usage";
import {
	hostCards,
	PRICE_TIERS,
	rowsForTab,
	type TierRow,
	type TierSort,
	type TierTab,
	tabExample,
	tierRows,
} from "@/lib/priceCatalog";
import {
	filterPricingMatrix,
	type ModelUsage,
	modelPriceSummaries,
	pricingCoverage,
	rankPriceRows,
	usageByGroup,
} from "@/lib/pricingMatrix";
import { sumCostRows } from "@/lib/usage-math/cost";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtMoneyCompact, fmtPct } from "@/usage/format";
import { useHostModelUsage, usePricingWindow } from "./useHostModelUsage";
import {
	matrixFromLists,
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "./usePricingMatrix";

export interface PricingSearch {
	q: string;
	tier: TierTab;
	host?: string;
	show_deprecated: boolean;
	by: TierSort;
	dir: "asc" | "desc";
}

export interface TierTabView {
	value: TierTab;
	label: string;
	/** "$10+"; empty for the unpriced tab. */
	range: string;
	count: number;
	/** The model standing for the tab, by label. */
	example?: string;
}

const NO_USAGE = new Map<string, ModelUsage>();

/** The trailing week's spend and unpriced share; null before it loads or
 * without traffic. Not suspending: a config page must not wait on, or fail
 * with, the usage store. */
function useWeekCost() {
	const win = usePricingWindow();
	const { previous } = usageComparisonWindows(win, useUsageNow());
	const { data } = useQuery(usageTotalsCompareQueryOptions(win, previous));
	const rows = data?.rows ?? [];
	if (rows.reduce((n, r) => n + r.requests, 0) === 0) return null;
	return sumCostRows(rows);
}

/** Last week's usage per value of one dimension; empty until it loads. */
function useWeekUsageBy(dimension: "model_id" | "host_id") {
	const { data } = useQuery(
		usageSummaryQueryOptions(dimension, usePricingWindow()),
	);
	return data ? usageByGroup(data.rows ?? [], dimension) : NO_USAGE;
}

function matches(row: TierRow, q: string): boolean {
	const host = row.cheapest?.host;
	return [row.model.label, row.model.slug, host?.label, host?.slug].some((s) =>
		s?.toLowerCase().includes(q),
	);
}

/** The catalog by price: host cards, models in price tiers by their cheapest
 * host, the open host's full rate table, and coverage figures. */
export function usePricingCatalog(search: PricingSearch) {
	const [graph, hosts, models, pricings] = useSuspenseQueries({
		queries: [
			pricingGraphQuery,
			hostsListQueryOptions,
			modelsListQueryOptions,
			pricingsMatrixListQuery,
		],
	});
	const cost = useWeekCost();
	const byModel = useWeekUsageBy("model_id");
	const byHost = useWeekUsageBy("host_id");

	const matrix = matrixFromLists({
		graph: graph.data,
		hosts: hosts.data,
		models: models.data,
		pricings: pricings.data,
	});
	const q = search.q.trim().toLowerCase();

	const open = matrix.find((h) => h.host.slug === search.host);
	const openUsage = useHostModelUsage(open ? [open.host.id] : []);
	const openHost = open
		? filterPricingMatrix(
				[
					{
						...open,
						rows: rankPriceRows(open.rows, openUsage.get(open.host.id)),
					},
				],
				search.q,
				false,
			)[0]
		: undefined;

	const rows = tierRows(modelPriceSummaries(matrix), byModel).filter(
		(r) => q === "" || matches(r, q),
	);
	const tabRows = (tab: TierTab) =>
		rowsForTab(rows, tab, search.show_deprecated);
	const tabs: TierTabView[] = [
		...PRICE_TIERS.map((t) => ({
			value: t.key,
			label: t.label,
			range: t.range,
		})),
		{ value: "unpriced" as const, label: "Unpriced", range: "" },
	].map((t) => {
		const list = tabRows(t.value);
		return { ...t, count: list.length, example: tabExample(list)?.model.label };
	});

	const matchedHosts = new Set(
		filterPricingMatrix(matrix, search.q, false).map((h) => h.host.id),
	);
	const { served, priced } = pricingCoverage(matrix);
	const figures: FigureData[] = [
		{
			key: "priced",
			label: "Bindings priced",
			value: fmtCompact(priced),
			note: `of ${fmtCompact(served)} served`,
		},
		{
			key: "spend",
			label: "Est. spend",
			value: cost?.usd != null ? fmtMoneyCompact(cost.usd, "USD") : "—",
			note: cost ? "last 7 days" : "no traffic last 7 days",
		},
		{
			key: "unpriced",
			label: "Requests unpriced",
			value: cost ? fmtPct(cost.unpricedShare) : "—",
			note: cost ? "last 7 days" : undefined,
		},
	];

	return {
		figures,
		// A search keeps the hosts it names and the hosts serving a model it names.
		hosts: hostCards(matrix, byHost).filter(
			(c) => q === "" || matchedHosts.has(c.host.id),
		),
		openHost,
		tabs,
		rows: rowsForTab(rows, search.tier, search.show_deprecated, {
			key: search.by,
			dir: search.dir,
		}),
		anyRows: matrix.length > 0,
		truncated:
			pricings.data.total > (pricings.data.items ?? []).length
				? {
						shown: (pricings.data.items ?? []).length,
						total: pricings.data.total,
					}
				: undefined,
	};
}
