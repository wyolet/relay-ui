import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Boxes, Plus } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
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
import { providersListQueryOptions, useProviders } from "@/api/hooks/providers";
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
	applyModelSort,
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "@/models/ModelsTable";
import { SearchBox } from "@/shared/SearchBox";
import { PageLoader } from "@/shared/Spinner";
import { TableToolbar } from "@/shared/TableToolbar";

type Tab = "models" | "hosts";

type ModelStatus = "active" | "deprecated" | "all";

const searchSchema = z.object({
	tab: z.enum(["models", "hosts"]).default("models"),
	q: z.string().default(""),
	deprecated: z.enum(["active", "deprecated", "all"]).default("active"),
	sort: z.enum(["name", "provider"]).default("name"),
	dir: z.enum(["asc", "desc"]).default("asc"),
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

/** Generous page size: we sort client-side, so load the whole filtered set and
 * warn (never silently truncate) if the relay reports more than we fetched. */
const MODELS_PAGE_LIMIT = 500;

/** Map the UI filter state to GET /models query params. */
function toModelsParams(q: string, status: ModelStatus): ModelsListParams {
	const params: ModelsListParams = { limit: MODELS_PAGE_LIMIT };
	const trimmed = q.trim();
	if (trimmed) params.q = trimmed;
	if (status === "active") params.deprecated = false;
	else if (status === "deprecated") params.deprecated = true;
	return params;
}

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ q: search.q, deprecated: search.deprecated }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				modelsListQuery(toModelsParams(deps.q, deps.deprecated)),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(governanceQueryOptions("model")),
		]),
	component: ModelsPage,
});

function ModelsList() {
	const search = Route.useSearch();
	const { data } = useModelsList(toModelsParams(search.q, search.deprecated));
	const { data: hostsData } = useHosts();
	const { data: providersData } = useProviders();
	const navigate = useNavigate({ from: "/models" });
	const items = data.items ?? [];
	const truncated = data.total > items.length;
	const hostsById = new Map(
		(hostsData.items ?? [])
			.filter((h) => h.metadata.id)
			.map((h) => [h.metadata.id as string, h] as const),
	);

	const providerSlugById = new Map(
		(providersData.items ?? [])
			.filter((p) => p.metadata.id)
			.map((p) => [p.metadata.id as string, p.metadata.name] as const),
	);

	// Server already applied q + status; we only sort the returned set.
	const visible = applyModelSort(
		items,
		search.sort,
		search.dir,
		providerSlugById,
	);

	const patch = (next: Record<string, string | boolean | undefined>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }) });
	function toggleSort(field: ModelsSortKey) {
		const dir: ModelsSortDir =
			search.sort === field ? (search.dir === "asc" ? "desc" : "asc") : "asc";
		patch({ sort: field, dir });
	}

	return (
		<div>
			<FilterBar
				defs={MODEL_FILTERS}
				state={{ q: search.q, deprecated: search.deprecated }}
				onChange={patch}
				className="mb-3"
				actions={
					<Link
						to="/models/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New model
					</Link>
				}
			/>

			<div className="mb-2 text-[11px] text-muted-foreground">
				{items.length} of {data.total} model{data.total === 1 ? "" : "s"}
			</div>

			{visible.length === 0 ? (
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
						items={visible}
						sort={search.sort}
						dir={search.dir}
						onSort={toggleSort}
						hostsById={hostsById}
					/>
					{truncated && (
						<p className="mt-2 text-[11px] text-muted-foreground">
							Showing the first {items.length} of {data.total}. Refine your
							search to narrow the list.
						</p>
					)}
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
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}
	function toggleSort(field: HostsSortKey) {
		const dir: HostsSortDir =
			search.hsort === field ? (search.hdir === "asc" ? "desc" : "asc") : "asc";
		void navigate({ search: (prev) => ({ ...prev, hsort: field, hdir: dir }) });
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
