import type { ResourceUsageStats } from "@/api/hooks/usage";

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
				<UsageCard label="Requests · 1h" value="0" sub="no traffic yet" />
				<UsageCard label="Error rate" value="—" />
				<UsageCard label="p95 latency" value="—" />
				<UsageCard label="Tokens" value="—" />
			</>
		);
	}
	const errorTone = usage.errorRate >= 0.05 ? "text-destructive" : undefined;
	return (
		<>
			<UsageCard label="Requests · 1h" value={fmtInt(usage.requests)} mono />
			<UsageCard
				label="Error rate"
				value={fmtPct(usage.errorRate)}
				sub={`${fmtInt(usage.errorCount)} errors`}
				valueClassName={errorTone}
				mono
			/>
			<UsageCard label="p95 latency" value={fmtMs(usage.duration.p95)} mono />
			<UsageCard label="Tokens" value={fmtCompact(usage.tokens)} mono />
		</>
	);
}

/** Placeholder cards while the usage query resolves. */
export function UsageCardsSkeleton() {
	return (
		<>
			{["Requests · 1h", "Error rate", "p95 latency", "Tokens"].map((label) => (
				<UsageCard key={label} label={label} value="…" />
			))}
		</>
	);
}

/** One compact resource stat tile — exported so domain cards (e.g. the
 * Est. spend card) can match the row exactly. */
export function UsageCard({
	label,
	value,
	sub,
	mono,
	valueClassName,
}: {
	label: string;
	value: string;
	sub?: string;
	mono?: boolean;
	valueClassName?: string;
}) {
	return (
		<div className="rounded-md border border-border bg-card px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-0.5 text-lg font-semibold tabular-nums ${
					mono ? "font-mono text-base" : ""
				} ${valueClassName ?? "text-foreground"}`}
			>
				{value}
			</div>
			{sub && (
				<div className="text-[11px] text-muted-foreground mt-0.5 truncate">
					{sub}
				</div>
			)}
		</div>
	);
}

function fmtInt(n: number): string {
	return n.toLocaleString();
}

function fmtPct(ratio: number): string {
	const pct = ratio * 100;
	const digits = pct > 0 && pct < 10 ? 1 : 0;
	return `${pct.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function fmtMs(ms: number): string {
	if (ms >= 1000)
		return `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
	return `${Math.round(ms)} ms`;
}

function fmtCompact(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
	if (n >= 1_000)
		return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
	return n.toLocaleString();
}
