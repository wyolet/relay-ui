import { useSuspenseQueries } from "@tanstack/react-query";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import {
	type CapabilityFilter,
	groupByFamily,
	hostLines,
	IN_USE,
	inUseCount,
	inUseGroups,
	isNarrowing,
	type LineGroup,
	type ModelsSortKey,
	modelMatches,
	pickPane,
	type RailHost,
	railHosts,
	sumUsage,
} from "@/lib/modelsByHost";
import type { MatrixHost, ModelUsage } from "@/lib/pricingMatrix";
import { useHostModelUsage, useWeekUsageBy } from "@/pricing/useHostModelUsage";
import {
	matrixFromLists,
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";

/** The models route's search, as its zod schema parses it. */
export interface ModelsSearch {
	host?: string;
	q: string;
	cap: CapabilityFilter;
	show_deprecated: boolean;
	by: ModelsSortKey;
	dir: "asc" | "desc";
}

export interface ModelsPaneView {
	/** The open pane: a host slug or {@link IN_USE}. */
	key: string;
	/** Set for a host's pane. */
	host?: MatrixHost;
	title: string;
	models: number;
	usage?: ModelUsage;
	groups: LineGroup[];
	/** Usage the pane is built from is still loading. */
	loading: boolean;
}

export interface ModelsRailView {
	/** Undefined until usage loads. */
	inUse?: number;
	hosts: RailHost[];
	/** Counts are matches: hosts without one dim. */
	narrowing: boolean;
}

/** The models catalog by host: the rail, and the open pane's models grouped
 * by family (a host) or by host (In use). Usage never suspends. */
export function useModelsByHost(search: ModelsSearch) {
	const [graph, hosts, models, pricings] = useSuspenseQueries({
		queries: [
			pricingGraphQuery,
			hostsListQueryOptions,
			modelsListQueryOptions,
			pricingsMatrixListQuery,
		],
	});
	const byModel = useWeekUsageBy("model_id");
	const byHost = useWeekUsageBy("host_id");

	const matrix = matrixFromLists({
		graph: graph.data,
		hosts: hosts.data,
		models: models.data,
		pricings: pricings.data,
	});
	const pricesById = new Map(matrix.map((p) => [p.host.id, p]));
	const modelsById = new Map<string, Model>();
	for (const m of models.data.items ?? []) {
		if (m.metadata.id) modelsById.set(m.metadata.id, m);
	}
	const filter = {
		q: search.q,
		cap: search.cap,
		showDeprecated: search.show_deprecated,
	};
	const sort = { key: search.by, dir: search.dir };

	const rail = railHosts(matrix, modelsById, byHost ?? new Map(), filter);
	const anyTraffic = byHost && [...byHost.values()].some((u) => u.requests > 0);
	const key = pickPane(search.host, rail, anyTraffic);

	const usedHosts = rail.filter((r) => (r.usage?.requests ?? 0) > 0);
	const open = rail.find((r) => r.host.slug === key);
	const paneHostIds =
		key === IN_USE
			? usedHosts.map((r) => r.host.id)
			: open
				? [open.host.id]
				: [];
	const usageByHost = useHostModelUsage(paneHostIds);

	let pane: ModelsPaneView;
	if (key === IN_USE) {
		const groups = inUseGroups(
			usedHosts.flatMap((r) => pricesById.get(r.host.id) ?? []),
			modelsById,
			usageByHost,
			filter,
			sort,
		);
		pane = {
			key,
			title: "In use",
			models: new Set(
				groups.flatMap((g) => g.lines.map((l) => l.model.metadata.id)),
			).size,
			usage: sumUsage(usedHosts.map((r) => r.usage)),
			groups,
			loading: !byHost || usedHosts.some((r) => !usageByHost.has(r.host.id)),
		};
	} else {
		const prices = open && pricesById.get(open.host.id);
		const lines = prices
			? hostLines(prices, modelsById, usageByHost.get(prices.host.id)).filter(
					(l) => modelMatches(l.model, filter),
				)
			: [];
		pane = {
			key,
			host: open?.host,
			title: open?.host.label ?? "",
			models: lines.length,
			usage: open?.usage,
			groups: groupByFamily(lines, sort),
			loading: false,
		};
	}

	const railView: ModelsRailView = {
		inUse: byModel && inUseCount(byModel, modelsById, filter),
		hosts: rail,
		narrowing: isNarrowing(filter),
	};
	return { rail: railView, pane, anyModels: rail.length > 0 };
}
