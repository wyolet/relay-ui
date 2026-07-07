import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { Suspense, useEffect } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions, useHosts } from "@/api/hooks/hosts";
import {
	type ModelsListParams,
	modelsListQuery,
	modelsListQueryOptions,
	useModelsList,
} from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/filters/FilterBar";
import type { FilterDef } from "@/filters/types";
import {
	applyHostFilter,
	applyHostSort,
	type HostsSortDir,
	type HostsSortKey,
	HostsTable,
} from "@/hosts/HostsTable";
import {
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "@/models/ModelsTable";
import { SearchBox } from "@/shared/SearchBox";
import { PageLoader } from "@/shared/Spinner";
import { TablePager } from "@/shared/TablePager";
import { TableToolbar } from "@/shared/TableToolbar";

type Tab = "models" | "hosts";

type ModelStatus = "active" | "deprecated" | "all";

const searchSchema = z.object({
	tab: z.enum(["models", "hosts"]).default("models"),
	q: z.string().default(""),
	deprecated: z.enum(["active", "deprecated", "all"]).default("active"),
	// Sorting is server-side now (the page window depends on it); "provider"
	// was accepted here but no column ever triggered it. catch() absorbs
	// stale bookmarked URLs instead of failing validation.
	sort: z.enum(["name"]).catch("name").default("name"),
	dir: z.enum(["asc", "desc"]).catch("asc").default("asc"),
	page: z.number().int().min(1).catch(1).default(1),
	hsort: z.enum(["name"]).default("name"),
	hdir: z.enum(["asc", "desc"]).default("asc"),
});

/** Filters rendered above the Models table (server-side). */
const MODEL_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search models",
		default: "",
	},
	{
		key: "deprecated",
		type: "select",
		label: "Status",
		default: "active",
		options: [
			{ value: "active", label: "Active only" },
			{ value: "deprecated", label: "Deprecated only" },
			{ value: "all", label: "All" },
		],
	},
] as const satisfies readonly FilterDef[];

const MODELS_PAGE_SIZE = 50;

/** Map the UI filter/sort/page state to GET /models query params. Filtering,
 * sorting, and windowing all happen server-side; the response's `total` is
 * the pre-window match count the pager renders from. */
function toModelsParams(
	q: string,
	status: ModelStatus,
	dir: ModelsSortDir,
	page: number,
): ModelsListParams {
	const params: ModelsListParams = {
		limit: MODELS_PAGE_SIZE,
		offset: (page - 1) * MODELS_PAGE_SIZE,
		// The engine accepts a "-" prefix for descending on every sortable
		// field; the generated enum only lists the ascending names (relay
		// OpenAPI gap), hence the cast.
		sort: (dir === "desc" ? "-name" : "name") as ModelsListParams["sort"],
	};
	const trimmed = q.trim();
	if (trimmed) params.q = trimmed;
	if (status === "active") params.deprecated = false;
	else if (status === "deprecated") params.deprecated = true;
	return params;
}

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		q: search.q,
		deprecated: search.deprecated,
		dir: search.dir,
		page: search.page,
	}),
	loader: ({ context, deps }) => {
		const { queryClient } = context;
		// Non-blocking: warm the full lists the diagnostics graph and hover
		// preloads need without gating the table's first paint.
		void queryClient.prefetchQuery(modelsListQueryOptions);
		void queryClient.prefetchQuery(hostKeysListQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void queryClient.prefetchQuery(relayKeysListQueryOptions);
		void queryClient.prefetchQuery(providersListQueryOptions);
		return Promise.all([
			queryClient.ensureQueryData(
				modelsListQuery(
					toModelsParams(deps.q, deps.deprecated, deps.dir, deps.page),
				),
			),
			queryClient.ensureQueryData(hostsListQueryOptions),
			queryClient.ensureQueryData(bindingsListQueryOptions),
			queryClient.ensureQueryData(governanceQueryOptions("model")),
		]);
	},
	component: ModelsPage,
});

function ModelsList() {
	const search = Route.useSearch();
	const { data } = useModelsList(
		toModelsParams(search.q, search.deprecated, search.dir, search.page),
	);
	const { data: hostsData } = useHosts();
	const navigate = useNavigate({ from: "/models" });
	// Server-filtered, -sorted, and -windowed: render as-is.
	const items = data.items ?? [];
	const hostsById = new Map(
		(hostsData.items ?? [])
			.filter((h) => h.metadata.id)
			.map((h) => [h.metadata.id as string, h] as const),
	);

	const patch = (next: Record<string, string | number | boolean | undefined>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	function toggleSort(_field: ModelsSortKey) {
		const dir: ModelsSortDir = search.dir === "asc" ? "desc" : "asc";
		patch({ dir, page: 1 });
	}

	// A filter change can strand the page past the last one — snap back.
	const pageCount = Math.max(1, Math.ceil(data.total / MODELS_PAGE_SIZE));
	useEffect(() => {
		if (search.page > pageCount) patch({ page: pageCount });
	});

	return (
		<div>
			<FilterBar
				defs={MODEL_FILTERS}
				state={{ q: search.q, deprecated: search.deprecated }}
				onChange={(next) => patch({ ...next, page: 1 })}
				className="mb-3"
			/>

			<div className="mb-2 text-[11px] text-muted-foreground">
				{data.total} model{data.total === 1 ? "" : "s"}
			</div>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Boxes className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					<p className="text-sm text-muted-foreground">
						{data.total === 0
							? "No models configured."
							: "No models match the current filter."}
					</p>
				</div>
			) : (
				<>
					<ModelsTable
						items={items}
						sort={search.sort}
						dir={search.dir}
						onSort={toggleSort}
						hostsById={hostsById}
					/>
					<TablePager
						page={search.page}
						pageSize={MODELS_PAGE_SIZE}
						total={data.total}
						onPage={(page) => patch({ page })}
					/>
				</>
			)}
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
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<p className="text-sm text-muted-foreground">
						{items.length === 0
							? "No hosts configured."
							: "No hosts match the current filter."}
					</p>
				</div>
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
		void navigate({ search: (prev) => ({ ...prev, tab }) });
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
				onValueChange={(v) => setTab((v ?? "models") as Tab)}
				className="mb-4"
			>
				<TabsList variant="underline">
					<TabsTrigger value="models" className="px-3 h-9">
						Models
					</TabsTrigger>
					<TabsTrigger value="hosts" className="px-3 h-9">
						Hosts
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<Suspense fallback={<PageLoader />}>
				{search.tab === "models" ? <ModelsList /> : <HostsList />}
			</Suspense>
		</div>
	);
}
