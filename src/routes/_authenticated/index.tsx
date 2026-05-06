import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import type {
	HealthStatusLevel,
	HealthSubsystem,
	MetricsResponse,
} from "#/api/dashboard-types";
import {
	healthzQueryOptions,
	metricsQueryOptions,
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

// --- sparkline hook ---

const RING_SIZE = 12;

function useMetricsRing(
	_key: keyof MetricsResponse,
	current: number | undefined,
) {
	const [ring, setRing] = useState<number[]>([]);

	useEffect(() => {
		if (current === undefined) return;
		setRing((prev) => {
			const next = [...prev, current];
			return next.length > RING_SIZE
				? next.slice(next.length - RING_SIZE)
				: next;
		});
	}, [current]);

	return ring;
}

// --- sparkline SVG ---

interface SparklineProps {
	values: number[];
	width?: number;
	height?: number;
}

function Sparkline({ values, width = 60, height = 20 }: SparklineProps) {
	if (values.length < 2) {
		return <svg width={width} height={height} aria-hidden="true" />;
	}
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const step = width / (values.length - 1);

	const points = values
		.map((v, i) => {
			const x = i * step;
			const y = height - ((v - min) / range) * (height - 2) - 1;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg width={width} height={height} aria-hidden="true">
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

// --- health tile ---

const STATUS_COLORS: Record<HealthStatusLevel, string> = {
	ok: "bg-green-50 border-green-200",
	degraded: "bg-yellow-50 border-yellow-200",
	error: "bg-red-50 border-red-200",
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
				<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
					{label}
				</span>
			</div>
			<span className="text-sm font-medium text-gray-900 capitalize">
				{level}
			</span>
			{subsystem?.error && (
				<span
					className="text-xs text-gray-500 truncate"
					title={subsystem.error}
				>
					{subsystem.error}
				</span>
			)}
		</div>
	);
}

// --- drop counter tile ---

interface DropTileProps {
	label: string;
	metricKey: keyof MetricsResponse;
	metricsData: MetricsResponse | undefined;
}

function DropTile({ label, metricKey, metricsData }: DropTileProps) {
	const current = metricsData?.[metricKey];
	const ring = useMetricsRing(metricKey, current);

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-2">
			<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
				{label}
			</span>
			<div className="flex items-end justify-between gap-2">
				<span className="text-2xl font-bold text-gray-900 tabular-nums">
					{current ?? "—"}
				</span>
				<span className="text-gray-400">
					<Sparkline values={ring} />
				</span>
			</div>
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
		<div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-1">
			<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
				{label}
			</span>
			<span className="text-2xl font-bold text-gray-900 tabular-nums">
				{count ?? "—"}
			</span>
		</div>
	);
}

// --- empty catalog welcome ---

function WelcomePanel() {
	return (
		<div className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center max-w-lg mx-auto mt-8">
			<h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Relay</h2>
			<p className="text-gray-600 mb-6 text-sm">
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

// --- dashboard inner (uses suspense queries) ---

function DashboardInner() {
	const { data: healthz } = useQuery(healthzQueryOptions);
	const { data: metrics } = useQuery(metricsQueryOptions);
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
				<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
					Health
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<HealthTile label="Catalog" subsystem={healthz?.catalog} />
					<HealthTile label="State" subsystem={healthz?.state} />
					<HealthTile label="Event Log" subsystem={healthz?.eventlog} />
					<HealthTile label="OTEL" subsystem={healthz?.otel} />
				</div>
			</section>

			{/* Drop counter tiles */}
			<section>
				<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
					Drop Counters
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<DropTile
						label="Eventlog Dropped"
						metricKey="eventlog_dropped"
						metricsData={metrics}
					/>
					<DropTile
						label="OTEL Dropped"
						metricKey="otel_dropped"
						metricsData={metrics}
					/>
					<DropTile
						label="Metadata Rejected"
						metricKey="metadata_rejected"
						metricsData={metrics}
					/>
					<DropTile
						label="Auth Rejected"
						metricKey="auth_rejected"
						metricsData={metrics}
					/>
				</div>
			</section>

			{/* Quick stats */}
			<section>
				<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
			<h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
			<Suspense
				fallback={<div className="text-gray-500 text-sm">Loading…</div>}
			>
				<DashboardInner />
			</Suspense>
		</div>
	);
}
