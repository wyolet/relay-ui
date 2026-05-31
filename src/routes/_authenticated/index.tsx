import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardKpis } from "@/dashboard/DashboardKpis";
import { ErrorHotspots } from "@/dashboard/ErrorHotspots";
import { HealthStrip } from "@/dashboard/HealthStrip";
import { ReleaseReadiness } from "@/dashboard/ReleaseReadiness";
import {
	type CatalogCount,
	useCatalogCounts,
} from "@/dashboard/useCatalogCounts";
import { ResourceGraphSVG } from "@/graph/ResourceGraphSVG";
import { PageLoader } from "@/shared/Spinner";
import { UsageTimelineChart } from "@/usage/UsageTimelineChart";
import { UsageTopGroups } from "@/usage/UsageTopGroups";

export const Route = createFileRoute("/_authenticated/")({
	component: DashboardPage,
});

function SectionLabel({ children }: { children: string }) {
	return (
		<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
}

function CountCard({ label, count }: CatalogCount) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
			<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<span className="text-2xl font-bold tabular-nums text-foreground">
				{count ?? "—"}
			</span>
		</div>
	);
}

function WelcomePanel() {
	return (
		<div className="mx-auto mt-8 max-w-lg rounded-xl border border-brand-200 bg-brand-50 p-8 text-center dark:border-brand-800 dark:bg-brand-950">
			<h2 className="mb-2 text-xl font-bold text-foreground">
				Welcome to Relay
			</h2>
			<p className="mb-6 text-sm text-muted-foreground">
				Your catalog is empty. Run the bootstrap wizard to add your first
				provider and secret.
			</p>
			<Link
				to="/bootstrap"
				className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
			>
				Get started →
			</Link>
		</div>
	);
}

function TrafficSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{["Requests", "Error rate", "Avg latency", "Tokens"].map((l) => (
				<div
					key={l}
					className="rounded-lg border border-border bg-card px-4 py-3"
				>
					<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{l}
					</div>
					<div className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
						…
					</div>
				</div>
			))}
		</div>
	);
}

function TrafficBand() {
	return (
		<section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
			<div className="flex flex-col gap-4">
				<DashboardKpis />
				<div className="rounded-lg border border-border bg-card p-4">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-medium text-foreground">
							Requests over time
						</h2>
						<Link
							to="/usage"
							className="text-[11px] text-muted-foreground hover:text-foreground"
						>
							View usage →
						</Link>
					</div>
					<UsageTimelineChart interval="1h" />
				</div>
			</div>
			<aside className="flex flex-col gap-4">
				<UsageTopGroups groupBy="model_id" limit={5} />
				<UsageTopGroups groupBy="host_id" limit={5} />
				<ErrorHotspots />
			</aside>
		</section>
	);
}

function DashboardInner() {
	const { counts, catalogEmpty } = useCatalogCounts();

	return (
		<div className="flex flex-col gap-6">
			<ReleaseReadiness />
			{catalogEmpty && <WelcomePanel />}

			<HealthStrip />

			{!catalogEmpty && (
				<Suspense fallback={<TrafficSkeleton />}>
					<TrafficBand />
				</Suspense>
			)}

			<section>
				<SectionLabel>Catalog</SectionLabel>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{counts.map((c) => (
						<CountCard key={c.label} label={c.label} count={c.count} />
					))}
				</div>
			</section>

			<section>
				<SectionLabel>Topology</SectionLabel>
				<ResourceGraphSVG />
			</section>
		</div>
	);
}

function DashboardPage() {
	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>
			<Suspense fallback={<PageLoader />}>
				<DashboardInner />
			</Suspense>
		</div>
	);
}
