import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { useAuth, whoamiQueryOptions } from "@/api/auth";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { buttonVariants } from "@/components/ui/button";
import { AttentionList } from "@/dashboard/AttentionList";
import { Breakdown } from "@/dashboard/Breakdown";
import { DashboardRange } from "@/dashboard/DashboardRange";
import { Headline } from "@/dashboard/Headline";
import { ReleaseReadiness } from "@/dashboard/ReleaseReadiness";
import { ScopedHome } from "@/dashboard/ScopedHome";
import { TrafficChart } from "@/dashboard/TrafficChart";
import { useCatalogEmpty } from "@/dashboard/useCatalogEmpty";
import { WeekFacts } from "@/dashboard/WeekFacts";
import { WeekHeatmap } from "@/dashboard/WeekHeatmap";
import { Section } from "@/shared/Section";
import { PageLoader } from "@/shared/Spinner";
import { useSetupStore } from "@/stores/setup";

export const Route = createFileRoute("/_authenticated/")({
	// First-run: a relay with no issued keys can't route anything yet, so steer
	// the operator into the guided wizard — once. Bailing out (or finishing)
	// sets `dismissed`, after which the WelcomePanel is the opt-in entry point.
	async beforeLoad({ context }) {
		if (useSetupStore.getState().dismissed) return;
		// The wizard configures the whole relay, so it is an admin flow; a
		// scoped actor cannot even list keys to answer the probe.
		const who = await context.queryClient.ensureQueryData(whoamiQueryOptions);
		if (!who.roles.includes("admin")) return;
		const keys =
			await context.queryClient.ensureQueryData(keysListQueryOptions);
		if ((keys.items ?? []).length === 0) {
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
				className={buttonVariants({ variant: "cta", size: "lg" })}
			>
				Get started →
			</Link>
		</div>
	);
}

/** A block's place while its data loads: same rhythm, no spinner. */
function Pending({
	title,
	height = "h-24",
}: {
	title: string;
	height?: string;
}) {
	return (
		<Section title={title}>
			<div className={`${height} rounded-bar bg-grid`} />
		</Section>
	);
}

function AdminHome() {
	const catalogEmpty = useCatalogEmpty();

	if (catalogEmpty) {
		return (
			<div className="flex flex-col gap-6">
				<ReleaseReadiness />
				<WelcomePanel />
			</div>
		);
	}

	return (
		<div className="grid gap-14">
			<ReleaseReadiness />
			<div className="grid gap-6">
				<DashboardRange />
				<Suspense fallback={<div className="h-28" />}>
					<Headline />
				</Suspense>
			</div>
			<Suspense fallback={<Pending title="In numbers" />}>
				<WeekFacts />
			</Suspense>
			<div className="grid gap-14 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<Suspense
					fallback={<Pending title="Traffic by model" height="h-[260px]" />}
				>
					<TrafficChart />
				</Suspense>
				<Section title="Needs attention" meta="last 24h">
					<Suspense
						fallback={<p className="text-label text-ink-3">Checking…</p>}
					>
						<AttentionList />
					</Suspense>
				</Section>
			</div>
			<Suspense fallback={<Pending title="Activity" height="h-48" />}>
				<WeekHeatmap />
			</Suspense>
			<Breakdown />
		</div>
	);
}

function DashboardInner() {
	// A scoped actor sees their own tenancy, not the fleet: every block below
	// reads catalog-wide endpoints their role bindings do not reach.
	const { isAdmin } = useAuth();
	return isAdmin ? <AdminHome /> : <ScopedHome />;
}

function DashboardPage() {
	return (
		<div>
			<h1 className="sr-only">Dashboard</h1>
			<Suspense fallback={<PageLoader />}>
				<DashboardInner />
			</Suspense>
		</div>
	);
}
