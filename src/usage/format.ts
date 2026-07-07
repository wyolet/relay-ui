import type { UsageGroupBy, UsageRange } from "@/api/hooks/usage";

/** Human-readable column header / label for a group-by dimension. */
const DIMENSION_LABELS: Record<UsageGroupBy, string> = {
	source: "Source",
	model_id: "Model",
	host_id: "Host",
	policy_id: "Policy",
	relay_key_hash: "Relay key",
	host_key_id: "Credential",
};

export function dimensionLabel(groupBy: UsageGroupBy): string {
	return DIMENSION_LABELS[groupBy];
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

/** Large counts → "1.3B" / "4.1M" / "12.4k". */
export function fmtCompact(n: number): string {
	if (n >= 1_000_000_000)
		return `${(n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
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

/** Money with adaptive precision; falls back when the code isn't ISO-valid. */
export function fmtMoney(amount: number, currency: string): string {
	const digits = amount !== 0 && Math.abs(amount) < 1 ? 4 : 2;
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			maximumFractionDigits: digits,
		}).format(amount);
	} catch {
		return `${amount.toFixed(digits)} ${currency}`;
	}
}

/** Compact money for KPI values and chart axes: "$1.2K", "$0.0042". */
export function fmtMoneyCompact(amount: number, currency: string): string {
	if (amount !== 0 && Math.abs(amount) < 1) return fmtMoney(amount, currency);
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: amount < 100 ? 2 : 1,
		}).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}

/** What a period-over-period delta is measured against, per range preset. */
export const RANGE_COMPARE_LABELS: Record<UsageRange, string> = {
	today: "vs yesterday",
	week: "vs last week",
	month: "vs last month",
	custom: "vs previous period",
};

/** Signed relative change, ratio → "+12%" / "−8%" / "±0%". */
export function fmtSignedPct(ratio: number): string {
	const pct = ratio * 100;
	const abs = Math.abs(pct);
	const digits = abs > 0 && abs < 10 ? 1 : 0;
	const sign = pct > 0 ? "+" : pct < 0 ? "−" : "±";
	return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

/** Signed rate change in percentage points, fraction → "+1.2 pp". */
export function fmtSignedPp(delta: number): string {
	const pp = delta * 100;
	const abs = Math.abs(pp);
	const digits = abs > 0 && abs < 10 ? 1 : 0;
	const sign = pp > 0 ? "+" : pp < 0 ? "−" : "±";
	return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: digits })} pp`;
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
