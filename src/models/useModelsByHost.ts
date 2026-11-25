import { useSuspenseQueries } from "@tanstack/react-query";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import {
	type CapabilityFilter,
	firstMatchingHost,
	groupByFamily,
	hostLines,
	IN_USE,
	inUseCount,
	inUseLines,
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

/** The models catalog by host: the rail, and the open pane's models, grouped
 * by family for a host and one plain list for In use. Usage never suspends. */
export function useModelsByHost(search: ModelsSearch) {
	const [graph, hosts, models, pricings, bindings] = useSuspenseQueries({
		queries: [
			pricingGraphQuery,
			hostsListQueryOptions,
			modelsListQueryOptions,
			pricingsMatrixListQuery,
			bindingsListQueryOptions,
		],
	});
	const byModel = useWeekUsageBy("model_id");
	const byHost = useWeekUsageBy("host_id");

	// The full binding list keeps disabled models in their host's pane; the
	// graph only carries what the data plane serves now.
	const matrix = matrixFromLists({
		graph: graph.data,
		bindings: (bindings.data.items ?? []).flatMap((b) =>
			b.spec.enabled === false
				? []
				: [{ hostId: b.spec.hostId, modelId: b.spec.modelId }],
		),
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
	const inUse = inUseLines(
		matrix,
		modelsById,
		byModel ?? new Map(),
		filter,
		sort,
	);
	const filterEmptiesInUse =
		search.host === undefined &&
		isNarrowing(filter) &&
		byModel !== undefined &&
		inUse.length === 0;
	const key =
		(filterEmptiesInUse && firstMatchingHost(rail)) ||
		pickPane(search.host, rail, anyTraffic);

	const open = rail.find((r) => r.host.slug === key);
	const usageByHost = useHostModelUsage(
		key !== IN_USE && open ? [open.host.id] : [],
	);

	let pane: ModelsPaneView;
	if (key === IN_USE) {
		const lines = inUse;
		pane = {
			key,
			title: "In use",
			models: lines.length,
			usage: sumUsage(lines.map((l) => l.usage)),
			groups: lines.length > 0 ? [{ key: IN_USE, label: "", lines }] : [],
			loading: !byModel,
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
