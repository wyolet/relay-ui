import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { resolveWindow, useStackedTimeline } from "@/api/hooks/usage";
import { DashboardKpis } from "@/dashboard/DashboardKpis";
import { ErrorHotspots } from "@/dashboard/ErrorHotspots";
import { OpsAttention } from "@/dashboard/OpsAttention";
import { ReleaseReadiness } from "@/dashboard/ReleaseReadiness";
import { useCatalogEmpty } from "@/dashboard/useCatalogEmpty";
import { PageLoader } from "@/shared/Spinner";
import { useSetupStore } from "@/stores/setup";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { UsageTopGroups } from "@/usage/UsageTopGroups";

export const Route = createFileRoute("/_authenticated/")({
	// First-run: a relay with no issued keys can't route anything yet, so steer
	// the operator into the guided wizard — once. Bailing out (or finishing)
	// sets `dismissed`, after which the WelcomePanel is the opt-in entry point.
	async beforeLoad({ context }) {
		if (useSetupStore.getState().dismissed) return;
		const relayKeys = await context.queryClient.ensureQueryData(
			relayKeysListQueryOptions,
		);
		if ((relayKeys.items ?? []).length === 0) {
			throw redirect({ to: "/setup" });
		}
	},
	component: DashboardPage,
});

function WelcomePanel() {
	return (
		<div className="mx-auto mt-8 max-w-lg rounded-xl border border-brand-200 bg-brand-50 p-8 text-center dark:border-brand-800 dark:bg-brand-950">
			<h2 className="mb-2 text-xl font-bold text-foreground">
				Welcome to Relay
			</h2>
			<p className="mb-6 text-sm text-muted-foreground">
				Your catalog is empty. Run the setup wizard to connect your first
				provider and issue a key.
			</p>
			<Link
				to="/setup"
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
	// The whole traffic band reads "this week" — KPIs, chart, leaderboards,
	// hotspots — so the numbers agree with each other at a glance.
	const win = resolveWindow("week");
	return (
		<section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
			<div className="flex flex-col gap-4">
				<DashboardKpis />
				<div className="rounded-lg border border-border bg-card p-4">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-medium text-foreground">
							Requests by model · this week
						</h2>
						<Link
							to="/usage"
							className="text-[11px] text-muted-foreground hover:text-foreground"
						>
							View usage →
						</Link>
					</div>
					<DashboardTraffic />
				</div>
			</div>
			<aside className="flex flex-col gap-4">
				<UsageTopGroups groupBy="model_id" limit={5} win={win} />
				<UsageTopGroups groupBy="host_id" limit={5} win={win} />
				<ErrorHotspots />
			</aside>
		</section>
	);
}

function DashboardTraffic() {
	const data = useStackedTimeline("model_id", "week", "requests");
	return (
		<StackedUsageChart
			data={data}
			groupBy="model_id"
			metric="requests"
			bare
			height="h-[240px]"
		/>
	);
}

function DashboardInner() {
	const catalogEmpty = useCatalogEmpty();

	return (
		<div className="flex flex-col gap-6">
			<ReleaseReadiness />
			{catalogEmpty && <WelcomePanel />}

			{!catalogEmpty && <OpsAttention />}

			{!catalogEmpty && (
				<Suspense fallback={<TrafficSkeleton />}>
					<TrafficBand />
				</Suspense>
			)}
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
