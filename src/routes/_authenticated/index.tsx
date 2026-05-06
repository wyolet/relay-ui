import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import type { HealthStatusLevel, HealthSubsystem } from "#/api/dashboard-types";
import {
	healthzQueryOptions,
	modelsQueryOptions,
	poolsQueryOptions,
	providersQueryOptions,
	ratelimitsQueryOptions,
	routesQueryOptions,
	secretsQueryOptions,
} from "#/api/queries/dashboard";

export const Route = createFileRoute("/_authenticated/")({
	component: DashboardPage,
});

// --- health tile ---

const STATUS_COLORS: Record<HealthStatusLevel, string> = {
	ok: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
	degraded:
		"bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
	error: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
};

const STATUS_DOT: Record<HealthStatusLevel, string> = {
	ok: "bg-green-500",
	degraded: "bg-yellow-500",
	error: "bg-red-500",
};

interface HealthTileProps {
	label: string;
	subsystem: HealthSubsystem | undefined;
}

function HealthTile({ label, subsystem }: HealthTileProps) {
	const level: HealthStatusLevel = subsystem?.status ?? "error";
	return (
		<div
			className={`rounded-lg border p-4 flex flex-col gap-1 ${STATUS_COLORS[level]}`}
			title={subsystem?.error ?? undefined}
		>
			<div className="flex items-center gap-2">
				<span
					className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[level]}`}
				/>
				<span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
					{label}
				</span>
			</div>
			<span className="text-sm font-medium text-gray-900 dark:text-zinc-100 capitalize">
				{level}
			</span>
			{subsystem?.error && (
				<span
					className="text-xs text-gray-500 dark:text-zinc-400 truncate"
					title={subsystem.error}
				>
					{subsystem.error}
				</span>
			)}
		</div>
	);
}

// --- count card ---

interface CountCardProps {
	label: string;
	count: number | undefined;
}

function CountCard({ label, count }: CountCardProps) {
	return (
		<div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-1">
			<span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
				{label}
			</span>
			<span className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tabular-nums">
				{count ?? "—"}
			</span>
		</div>
	);
}

// --- empty catalog welcome ---

function WelcomePanel() {
	return (
		<div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-8 text-center max-w-lg mx-auto mt-8">
			<h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
				Welcome to Relay
			</h2>
			<p className="text-gray-600 dark:text-zinc-400 mb-6 text-sm">
				Your catalog is empty. Run the bootstrap wizard to add your first
				provider and secret.
			</p>
			<Link
				to="/bootstrap"
				className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
			<h2 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
				Drop Counters
			</h2>
			{/* TODO: implement when backend exposes GET /admin/metrics */}
			<div className="rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-6 py-4 text-sm text-gray-500 dark:text-zinc-400">
				Metrics endpoint pending — drop counters will appear here once the relay
				backend exposes <code className="font-mono">/admin/metrics</code>.
			</div>
		</section>
	);
}

// --- dashboard inner (uses suspense queries) ---

function DashboardInner() {
	const { data: healthz } = useQuery(healthzQueryOptions);
	const { data: providers } = useQuery(providersQueryOptions);
	const { data: secrets } = useQuery(secretsQueryOptions);
	const { data: pools } = useQuery(poolsQueryOptions);
	const { data: models } = useQuery(modelsQueryOptions);
	const { data: routes } = useQuery(routesQueryOptions);
	const { data: ratelimits } = useQuery(ratelimitsQueryOptions);

	const catalogEmpty =
		(providers?.items.length ?? 0) === 0 && (secrets?.items.length ?? 0) === 0;

	return (
		<div className="space-y-8">
			{catalogEmpty && <WelcomePanel />}

			{/* Health tiles */}
			<section>
				<h2 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
					Health
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<HealthTile label="Catalog" subsystem={healthz?.catalog} />
					<HealthTile label="State" subsystem={healthz?.state} />
					<HealthTile label="Event Log" subsystem={healthz?.eventlog} />
					<HealthTile label="OTEL" subsystem={healthz?.otel} />
				</div>
			</section>

			{/* Metrics placeholder — /admin/metrics does not exist yet */}
			<MetricsPending />

			{/* Quick stats */}
			<section>
				<h2 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
					Catalog
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					<CountCard label="Providers" count={providers?.items.length} />
					<CountCard label="Pools" count={pools?.items.length} />
					<CountCard label="Secrets" count={secrets?.items.length} />
					<CountCard label="Models" count={models?.items.length} />
					<CountCard label="Routes" count={routes?.items.length} />
					<CountCard label="Rate Limits" count={ratelimits?.items.length} />
				</div>
			</section>
		</div>
	);
}

function DashboardPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6">
				Dashboard
			</h1>
			<Suspense
				fallback={
					<div className="text-gray-500 dark:text-zinc-400 text-sm">
						Loading…
					</div>
				}
			>
				<DashboardInner />
			</Suspense>
		</div>
	);
}
