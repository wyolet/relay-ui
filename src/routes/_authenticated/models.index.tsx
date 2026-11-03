import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { Suspense, useEffect } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions, useHosts } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import {
	type ModelsListParams,
	modelsListQuery,
	modelsListQueryOptions,
	useModelsList,
} from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/filters/FilterBar";
import {
	applyHostFilter,
	applyHostSort,
	type HostsSortDir,
	type HostsSortKey,
	HostsTable,
} from "@/hosts/HostsTable";
import { awaitOnEnter } from "@/lib/awaitOnEnter";
import {
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "@/models/ModelsTable";
import { useModelFilters } from "@/models/useModelFilters";
import { useModelsPricePage } from "@/models/useModelsPricePage";
import {
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";
import { SearchBox } from "@/shared/SearchBox";
import { PageLoader } from "@/shared/Spinner";
import { StaleContent } from "@/shared/StaleContent";
import { TableEmpty } from "@/shared/TableEmpty";
import { TablePager } from "@/shared/TablePager";
import { TableToolbar } from "@/shared/TableToolbar";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

type Tab = "featured" | "models" | "hosts";

type ModelStatus = "active" | "deprecated" | "all";

const searchSchema = z.object({
	tab: z
		.enum(["featured", "models", "hosts"])
		.catch("featured")
		.default("featured"),
	q: z.string().default(""),
	deprecated: z.enum(["active", "deprecated", "all"]).default("active"),
	line: z.string().catch("").default(""),
	// catch() absorbs stale bookmarked URLs instead of failing validation.
	sort: z.enum(["name", "price"]).catch("name").default("name"),
	dir: z.enum(["asc", "desc"]).catch("asc").default("asc"),
	page: z.number().int().min(1).catch(1).default(1),
	hsort: z.enum(["name"]).default("name"),
	hdir: z.enum(["asc", "desc"]).default("asc"),
});

const MODELS_PAGE_SIZE = 50;

/** Map the UI filter/sort/page state to GET /models query params. Filtering
 * happens server-side; so do sorting and windowing by name, while a price sort
 * takes the full filtered set. `total` is the pre-window match count. */
function toModelsParams({
	featured,
	q,
	status,
	line,
	sort,
	dir,
	page,
}: {
	featured: boolean;
	q: string;
	status: ModelStatus;
	line: string;
	sort: ModelsSortKey;
	dir: ModelsSortDir;
	page: number;
}): ModelsListParams {
	const params: ModelsListParams =
		sort === "price"
			? { limit: 0, sort: "name" }
			: {
					limit: MODELS_PAGE_SIZE,
					offset: (page - 1) * MODELS_PAGE_SIZE,
					sort: dir === "desc" ? "-name" : "name",
				};
	const trimmed = q.trim();
	if (trimmed) params.q = trimmed;
	if (line) params.product_line = [line];
	if (featured) params.label = ["featured=true"];
	if (status === "active") params.deprecated = false;
	else if (status === "deprecated") params.deprecated = true;
	return params;
}

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		featured: search.tab === "featured",
		q: search.q,
		deprecated: search.deprecated,
		line: search.line,
		sort: search.sort,
		dir: search.dir,
		page: search.page,
	}),
	loader: ({ context, deps, cause }) => {
		const { queryClient } = context;
		// Non-blocking: warm the full lists the diagnostics graph and hover
		// preloads need without gating the table's first paint.
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(keysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		void queryClient.prefetchQuery(pricingGraphQuery);
		void queryClient.prefetchQuery(pricingsMatrixListQuery);
		return awaitOnEnter(
			cause,
			Promise.all([
				queryClient.ensureQueryData(
					modelsListQuery(toModelsParams({ ...deps, status: deps.deprecated })),
				),
				queryClient.ensureQueryData(hostsListQueryOptions),
				queryClient.ensureQueryData(bindingsListQueryOptions),
				queryClient.ensureQueryData(governanceQueryOptions("model")),
			]),
		);
	},
	component: ModelsPage,
});

function ModelsList() {
	const live = Route.useSearch();
	const { search, isStale } = useDeferredSearch(live);
	const featured = search.tab === "featured";
	const { data } = useModelsList(
		toModelsParams({
			featured,
			q: search.q,
			status: search.deprecated,
			line: search.line,
			sort: search.sort,
			dir: search.dir,
			page: search.page,
		}),
	);
	const { items, prices } = useModelsPricePage(
		data.items ?? [],
		search.sort,
		search.dir,
		search.page,
		MODELS_PAGE_SIZE,
	);
	const filters = useModelFilters();
	const { data: hostsData } = useHosts();
	const navigate = useNavigate({ from: "/models" });
	const hostsById = new Map(
		(hostsData.items ?? [])
			.filter((h) => h.metadata.id)
			.map((h) => [h.metadata.id as string, h] as const),
	);

	const patch = (next: Record<string, string | number | boolean | undefined>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	function toggleSort(field: ModelsSortKey) {
		const dir: ModelsSortDir =
			search.sort === field && search.dir === "asc" ? "desc" : "asc";
		patch({ sort: field, dir, page: 1 });
	}

	// A filter change can strand the page past the last one — snap back.
	const pageCount = Math.max(1, Math.ceil(data.total / MODELS_PAGE_SIZE));
	useEffect(() => {
		if (search.page > pageCount) patch({ page: pageCount });
	});

	return (
		<div>
			<FilterBar
				defs={filters}
				state={{ q: live.q, deprecated: live.deprecated, line: live.line }}
				onChange={(next) => patch({ ...next, page: 1 })}
				className="mb-3"
			/>

			<StaleContent stale={isStale}>
				<div className="mb-2 text-[11px] text-muted-foreground">
					{data.total} {featured ? "featured " : ""}model
					{data.total === 1 ? "" : "s"}
				</div>

				{items.length === 0 ? (
					<TableEmpty icon={Boxes}>
						<p className="text-sm text-muted-foreground">
							{featured
								? "No featured models match. Browse the full catalog under All models."
								: data.total === 0
									? "No models configured."
									: "No models match the current filter."}
						</p>
					</TableEmpty>
				) : (
					<>
						<ModelsTable
							items={items}
							sort={search.sort}
							dir={search.dir}
							onSort={toggleSort}
							hostsById={hostsById}
							prices={prices}
						/>
						<TablePager
							page={search.page}
							pageSize={MODELS_PAGE_SIZE}
							total={data.total}
							onPage={(page) => patch({ page })}
						/>
					</>
				)}
			</StaleContent>
		</div>
	);
}

function HostsList() {
	const { data } = useHosts();
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();
	const items = data.items ?? [];

	const filtered = applyHostFilter(items, search.q);
	const visible = applyHostSort(filtered, search.hsort, search.hdir);

	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }), replace: true });
	}
	function toggleSort(field: HostsSortKey) {
		const dir: HostsSortDir =
			search.hsort === field ? (search.hdir === "asc" ? "desc" : "asc") : "asc";
		void navigate({
			search: (prev) => ({ ...prev, hsort: field, hdir: dir }),
			replace: true,
		});
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={search.q}
						onChange={setQ}
						placeholder="Search hosts"
					/>
				}
			/>

			{visible.length === 0 ? (
				<TableEmpty>
					<p className="text-sm text-muted-foreground">
						{items.length === 0
							? "No hosts configured."
							: "No hosts match the current filter."}
					</p>
				</TableEmpty>
			) : (
				<HostsTable
					items={visible}
					sort={search.hsort}
					dir={search.hdir}
					onSort={toggleSort}
				/>
			)}
		</div>
	);
}

function ModelsPage() {
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab, page: 1 }) });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Models</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Models you've registered and the upstream hosts that serve them.
				</p>
			</div>

			<Tabs
				value={search.tab}
				onValueChange={(v) => setTab((v ?? "featured") as Tab)}
				className="mb-4"
			>
				<TabsList variant="underline">
					<TabsTrigger value="featured" className="px-3 h-9">
						Featured
					</TabsTrigger>
					<TabsTrigger value="models" className="px-3 h-9">
						All models
					</TabsTrigger>
					<TabsTrigger value="hosts" className="px-3 h-9">
						Hosts
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<Suspense fallback={<PageLoader />}>
				{search.tab === "hosts" ? <HostsList /> : <ModelsList />}
			</Suspense>
		</div>
	);
}
