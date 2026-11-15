import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import type { FilterDef } from "@/filters/types";
import { awaitOnEnter } from "@/lib/awaitOnEnter";
import { HostPricesSection } from "@/pricing/HostPricesSection";
import { PricingHostGrid } from "@/pricing/PricingHostGrid";
import { PricingTierTable } from "@/pricing/PricingTierTable";
import { usePricingCatalog } from "@/pricing/usePricingCatalog";
import {
	pricingGraphQuery,
	pricingsMatrixListQuery,
} from "@/pricing/usePricingMatrix";
import { FigureRow, FigureRowSkeleton } from "@/shared/FigureRow";
import { SectionSkeleton } from "@/shared/Section";
import { StaleContent } from "@/shared/StaleContent";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

const searchSchema = z.object({
	q: z.string().default(""),
	tier: z.enum(["top", "high", "mid", "low", "unpriced"]).default("top"),
	host: z.string().optional(),
	show_deprecated: z.boolean().default(false),
});

const PRICING_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search models, hosts, sheets",
		default: "",
	},
	{
		key: "show_deprecated",
		type: "toggle",
		label: "Show deprecated",
		default: false,
	},
] as const satisfies readonly FilterDef[];

export const Route = createFileRoute("/_authenticated/pricing/")({
	validateSearch: searchSchema,
	loader: ({ context, cause }) =>
		awaitOnEnter(
			cause,
			Promise.all([
				context.queryClient.ensureQueryData(pricingGraphQuery),
				context.queryClient.ensureQueryData(pricingsMatrixListQuery),
				context.queryClient.ensureQueryData(modelsListQueryOptions),
				context.queryClient.ensureQueryData(hostsListQueryOptions),
			]),
		),
	component: PricingPage,
});

function PricingCatalog() {
	const live = Route.useSearch();
	const { search, isStale } = useDeferredSearch(live);
	const navigate = useNavigate({ from: "/pricing" });
	const { figures, hosts, openHost, tabs, rows, anyRows, truncated } =
		usePricingCatalog(search);

	const patch = (next: Partial<z.infer<typeof searchSchema>>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

	return (
		<div className="grid gap-14">
			<FigureRow figures={figures} />
			<div className="grid gap-10">
				<FilterBar
					defs={PRICING_FILTERS}
					state={{ q: live.q, show_deprecated: live.show_deprecated }}
					onChange={patch}
				/>
				{truncated && (
					<p className="text-meta text-ink-3">
						Showing rates from the first {truncated.shown} of {truncated.total}{" "}
						sheets.
					</p>
				)}
				<StaleContent stale={isStale}>
					{!anyRows ? (
						<p className="text-label text-ink-2">
							No host serves a model yet. Bind a model to a host, then price it
							here.
						</p>
					) : (
						<div className="grid gap-14">
							<PricingHostGrid cards={hosts} open={search.host} />
							{openHost && <HostPricesSection prices={openHost} unfolded />}
							<PricingTierTable
								tabs={tabs}
								tier={search.tier}
								rows={rows}
								onTier={(tier) => patch({ tier })}
							/>
							<p className="text-meta text-ink-3">
								Base rates per 1M tokens. A + marks a meter that charges more
								above a token threshold; its rate sheet lists the tiers.
							</p>
						</div>
					)}
				</StaleContent>
			</div>
		</div>
	);
}

function PricingPage() {
	return (
		<div className="grid gap-10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Pricing</h1>
					<p className="mt-1 text-label text-ink-2">
						What each host charges per 1M tokens for each model. Spend in Usage
						is estimated from these rates; unpriced requests count as —, never
						$0.
					</p>
				</div>
				<Link
					to="/pricing/new"
					className={buttonVariants({ variant: "cta", size: "lg" })}
				>
					<Plus className="size-3.5" />
					New pricing
				</Link>
			</div>
			<Suspense
				fallback={
					<div className="grid gap-14">
						<FigureRowSkeleton />
						<SectionSkeleton height="h-64" />
					</div>
				}
			>
				<PricingCatalog />
			</Suspense>
		</div>
	);
}
