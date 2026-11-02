import type { ResourceUsageStats } from "@/api/hooks/usage";
import { StatCard } from "@/shared/StatCard";
import { fmtCompact, fmtInt, fmtMs, fmtPct } from "@/usage/format";

/**
 * The four real usage cards (Requests / Error rate / p95 / Tokens) shared by
 * the host, model, and policy Overview tabs. Purely presentational — pass in
 * `usage` from the per-resource hook; `null` means the resource has no traffic
 * in the window. The window is the relay's default trailing hour (the
 * per-resource queries send no from/to), hence the "· 1h" labels.
 */
export function ResourceUsageCards({
	usage,
}: {
	usage: ResourceUsageStats | null;
}) {
	if (!usage || usage.requests === 0) {
		return (
			<>
				<StatCard label="Requests · 1h" value="0" sub="no traffic yet" />
				<StatCard label="Error rate" value="—" />
				<StatCard label="p95 latency" value="—" />
				<StatCard label="Tokens" value="—" />
			</>
		);
	}
	const errorTone = usage.errorRate >= 0.05 ? "text-destructive" : undefined;
	return (
		<>
			<StatCard label="Requests · 1h" value={fmtInt(usage.requests)} mono />
			<StatCard
				label="Error rate"
				value={fmtPct(usage.errorRate)}
				sub={`${fmtInt(usage.errorCount)} errors`}
				valueClassName={errorTone}
				mono
			/>
			<StatCard label="p95 latency" value={fmtMs(usage.duration.p95)} mono />
			<StatCard label="Tokens" value={fmtCompact(usage.tokens)} mono />
		</>
	);
}

/** Placeholder cards while the usage query resolves. */
export function UsageCardsSkeleton() {
	return (
		<>
			{["Requests · 1h", "Error rate", "p95 latency", "Tokens"].map((label) => (
				<StatCard key={label} label={label} value="…" />
			))}
		</>
	);
}
