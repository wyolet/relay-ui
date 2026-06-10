import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Banknote, Plus } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	type PricingsListParams,
	pricingsListQuery,
	usePricingsList,
} from "@/api/hooks/pricings";
import { FilterBar } from "@/filters/FilterBar";
import type { FilterDef } from "@/filters/types";
import { PricingsTable } from "@/pricing/PricingsTable";
import { PageLoader } from "@/shared/Spinner";

type EnabledFilter = "all" | "enabled" | "disabled";

const searchSchema = z.object({
	q: z.string().default(""),
	enabled: z.enum(["all", "enabled", "disabled"]).default("all"),
});

const PRICING_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search pricings",
		default: "",
	},
	{
		key: "enabled",
		type: "select",
		label: "Status",
		default: "all",
		options: [
			{ value: "all", label: "All" },
			{ value: "enabled", label: "Enabled only" },
			{ value: "disabled", label: "Disabled only" },
		],
	},
] as const satisfies readonly FilterDef[];

/** Generous page size; warn (never silently truncate) past it. */
const PRICINGS_PAGE_LIMIT = 500;

function toParams(q: string, enabled: EnabledFilter): PricingsListParams {
	const params: PricingsListParams = { limit: PRICINGS_PAGE_LIMIT };
	const trimmed = q.trim();
	if (trimmed) params.q = trimmed;
	if (enabled === "enabled") params.enabled = true;
	else if (enabled === "disabled") params.enabled = false;
	return params;
}

export const Route = createFileRoute("/_authenticated/pricing/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ q: search.q, enabled: search.enabled }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				pricingsListQuery(toParams(deps.q, deps.enabled)),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
		]),
	component: PricingsPage,
});

function PricingsList() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/pricing" });
	const { data } = usePricingsList(toParams(search.q, search.enabled));
	const items = data.items ?? [];
	const truncated = data.total > items.length;

	const patch = (next: Record<string, string | boolean | undefined>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }) });

	return (
		<div>
			<FilterBar
				defs={PRICING_FILTERS}
				state={{ q: search.q, enabled: search.enabled }}
				onChange={patch}
				className="mb-3"
			/>

			<div className="mb-2 text-[11px] text-muted-foreground">
				{items.length} of {data.total} pricing{data.total === 1 ? "" : "s"}
			</div>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Banknote className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					<p className="text-sm text-muted-foreground">
						{data.total === 0
							? "No pricings configured. Rates attached to host bindings power every cost estimate."
							: "No pricings match the current filter."}
					</p>
				</div>
			) : (
				<>
					<PricingsTable items={items} />
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

function PricingsPage() {
	return (
		<div>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-lg font-semibold text-foreground">Pricing</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Rate cards for model↔host bindings — they drive every spend estimate
						in Usage.
					</p>
				</div>
				<Link
					to="/pricing/new"
					className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground shrink-0"
				>
					<Plus className="w-3.5 h-3.5" />
					New pricing
				</Link>
			</div>

			<Suspense fallback={<PageLoader />}>
				<PricingsList />
			</Suspense>
		</div>
	);
}
