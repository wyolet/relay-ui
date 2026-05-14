import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";

export const Route = createFileRoute("/_authenticated/")({
	component: DashboardPage,
});

// --- count card ---

interface CountCardProps {
	label: string;
	count: number | undefined;
}

function CountCard({ label, count }: CountCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
			<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
			<span className="text-2xl font-bold text-foreground tabular-nums">
				{count ?? "—"}
			</span>
		</div>
	);
}

// --- empty catalog welcome ---

function WelcomePanel() {
	return (
		<div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 p-8 text-center max-w-lg mx-auto mt-8">
			<h2 className="text-xl font-bold text-foreground mb-2">
				Welcome to Relay
			</h2>
			<p className="text-muted-foreground mb-6 text-sm">
				Your catalog is empty. Run the bootstrap wizard to add your first
				provider and secret.
			</p>
			<Link
				to="/bootstrap"
				className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
			>
				Get started →
			</Link>
		</div>
	);
}

// --- metrics placeholder ---

function MetricsPending() {
	return (
		<section>
			<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
				Drop Counters
			</h2>
			{/* TODO: implement when backend exposes GET /admin/metrics */}
			<div className="rounded-lg border border-dashed border-input bg-neutral-50 dark:bg-neutral-800 px-6 py-4 text-sm text-muted-foreground">
				Metrics endpoint pending — drop counters will appear here once the relay
				backend exposes <code className="font-mono">/admin/metrics</code>.
			</div>
		</section>
	);
}

// --- dashboard inner (uses suspense queries) ---

function DashboardInner() {
	const { data: providers } = useQuery(providersListQueryOptions);
	const { data: secrets } = useQuery(hostKeysListQueryOptions);
	const { data: policies } = useQuery(policiesListQueryOptions);
	const { data: models } = useQuery(modelsListQueryOptions);
	const { data: hosts } = useQuery(hostsListQueryOptions);
	const { data: ratelimits } = useQuery(rateLimitsListQueryOptions);

	const catalogEmpty =
		(providers?.items ?? []).length === 0 &&
		(secrets?.items ?? []).length === 0;

	return (
		<div className="space-y-8">
			{catalogEmpty && <WelcomePanel />}

			{/* Health tiles pending — /healthz is not yet on the control plane. */}

			{/* Metrics placeholder — /control/metrics does not exist yet */}
			<MetricsPending />

			{/* Quick stats */}
			<section>
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Catalog
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					<CountCard label="Providers" count={providers?.items?.length} />
					<CountCard label="Policies" count={policies?.items?.length} />
					<CountCard label="Host Keys" count={secrets?.items?.length} />
					<CountCard label="Models" count={models?.items?.length} />
					<CountCard label="Hosts" count={hosts?.items?.length} />
					<CountCard label="Rate Limits" count={ratelimits?.items?.length} />
				</div>
			</section>
		</div>
	);
}

function DashboardPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
			<Suspense
				fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
			>
				<DashboardInner />
			</Suspense>
		</div>
	);
}
