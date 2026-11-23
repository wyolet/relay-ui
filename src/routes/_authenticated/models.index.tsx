import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { usageNow, usageSummaryQueryOptions } from "@/api/hooks/usage";
import { FilterBar, type SortControl } from "@/filters/FilterBar";
import type { FilterDef } from "@/filters/types";
import { awaitOnEnter } from "@/lib/awaitOnEnter";
import { CAPABILITY_FILTERS, type ModelsSortKey } from "@/lib/modelsByHost";
import { ModelsHostRail } from "@/models/ModelsHostRail";
import { ModelsPane } from "@/models/ModelsPane";
import { useModelsByHost } from "@/models/useModelsByHost";
import { pricingWindowAt } from "@/pricing/useHostModelUsage";
import {
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";
import { SectionSkeleton } from "@/shared/Section";
import { StaleContent } from "@/shared/StaleContent";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

// host, show_deprecated, by and dir share /pricing's types: search types are
// unioned across routes, so a key must mean the same thing everywhere.
const searchSchema = z.object({
	host: z.string().optional(),
	q: z.string().default(""),
	cap: z.enum(CAPABILITY_FILTERS).catch("any").default("any"),
	show_deprecated: z.boolean().default(false),
	by: z
		.enum(["spend", "newest", "price", "name"])
		.catch("spend")
		.default("spend"),
	dir: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

const MODEL_SORTS = [
	{ value: "spend", label: "Your usage" },
	{ value: "newest", label: "Newest" },
	{ value: "price", label: "Price" },
	{ value: "name", label: "Name" },
] as const;

const MODEL_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search models, families",
		default: "",
	},
	{
		key: "cap",
		type: "select",
		label: "Capability",
		default: "any",
		options: [
			{ value: "any", label: "Any" },
			{ value: "tools", label: "Tools" },
			{ value: "vision", label: "Vision" },
			{ value: "reasoning", label: "Reasoning" },
		],
	},
	{
		key: "show_deprecated",
		type: "toggle",
		label: "Show deprecated",
		default: false,
	},
] as const satisfies readonly FilterDef[];

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loader: ({ context, cause }) => {
		const { queryClient } = context;
		const week = pricingWindowAt(usageNow());
		void queryClient.prefetchQuery(usageSummaryQueryOptions("model_id", week));
		void queryClient.prefetchQuery(usageSummaryQueryOptions("host_id", week));
		void queryClient.prefetchQuery(providersListQueryOptions);
		return awaitOnEnter(
			cause,
			Promise.all([
				queryClient.ensureQueryData(pricingGraphQuery),
				queryClient.ensureQueryData(pricingsMatrixListQuery),
				queryClient.ensureQueryData(modelsListQueryOptions),
				queryClient.ensureQueryData(hostsListQueryOptions),
				queryClient.ensureQueryData(bindingsListQueryOptions),
				queryClient.ensureQueryData(governanceQueryOptions("model")),
			]),
		);
	},
	component: ModelsPage,
});

function ModelsCatalog() {
	const live = Route.useSearch();
	const { search, isStale } = useDeferredSearch(live);
	const navigate = useNavigate({ from: "/models" });
	const { rail, pane, anyModels } = useModelsByHost(search);

	const patch = (next: Partial<z.infer<typeof searchSchema>>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	const sort: SortControl<ModelsSortKey> = {
		options: MODEL_SORTS,
		value: live.by,
		dir: live.dir,
		onChange: (by, dir) => patch({ by, dir }),
	};

	return (
		<div className="grid gap-8">
			<FilterBar
				defs={MODEL_FILTERS}
				state={{
					q: live.q,
					cap: live.cap,
					show_deprecated: live.show_deprecated,
				}}
				onChange={patch}
				sort={sort}
			/>
			{!anyModels ? (
				<p className="text-label text-ink-2">
					No host serves a model yet. Connect a provider to sync its catalog.
				</p>
			) : (
				<StaleContent stale={isStale}>
					<div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
						<ModelsHostRail rail={rail} open={pane.key} />
						<ModelsPane pane={pane} narrowing={rail.narrowing} />
					</div>
				</StaleContent>
			)}
		</div>
	);
}

function ModelsPage() {
	return (
		<div className="grid gap-10">
			<div>
				<h1 className="text-2xl font-bold text-foreground">Models</h1>
				<p className="mt-1 text-label text-ink-2">
					The models each host serves, what they cost there, and how much you
					used them in the last 7 days.
				</p>
			</div>
			<Suspense fallback={<SectionSkeleton height="h-96" />}>
				<ModelsCatalog />
			</Suspense>
		</div>
	);
}
