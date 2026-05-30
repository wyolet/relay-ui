import type { UsageGroupBy } from "@/api/hooks/usage";

/** Human-readable column header / label for a group-by dimension. */
const DIMENSION_LABELS: Record<UsageGroupBy, string> = {
	source: "Source",
	model_id: "Model",
	host_id: "Host",
	policy_id: "Policy",
	relay_key_hash: "Relay key",
	host_key_id: "Host key",
};

export function dimensionLabel(groupBy: UsageGroupBy): string {
	return DIMENSION_LABELS[groupBy];
}

/** Pull the grouped dimension value out of a row's `group` map. */
export function groupValue(
	group: { [key: string]: string } | undefined,
	groupBy: UsageGroupBy,
): string {
	return group?.[groupBy]?.trim() || "—";
}

export function fmtInt(n: number): string {
	return n.toLocaleString();
}

/** Ratio 0..1 → "1.2%" (more precision under 10%, none above). */
export function fmtPct(ratio: number): string {
	const pct = ratio * 100;
	const digits = pct > 0 && pct < 10 ? 1 : 0;
	return `${pct.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

/** Large counts → "4.1M" / "12.4k". */
export function fmtCompact(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
	if (n >= 1_000)
		return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
	return n.toLocaleString();
}

/** Latency in ms → "123 ms" / "1.2 s". */
export function fmtMs(ms: number): string {
	if (ms >= 1000)
		return `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
	return `${Math.round(ms)} ms`;
}

export function sumTokens(
	tokens: { [key: string]: number } | undefined,
): number {
	if (!tokens) return 0;
	let total = 0;
	for (const v of Object.values(tokens)) total += v;
	return total;
}

export function fmtTs(ts: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return d.toLocaleString();
}

/** Compact time for chart axis ticks. */
export function fmtBucket(ts: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return d.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function fmtRange(from: string, to: string): string {
	return `${fmtTs(from)} → ${fmtTs(to)}`;
}
