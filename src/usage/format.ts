import type { UsageGroupBy, UsageRange } from "@/api/hooks/usage";
import { fmtTs } from "@/lib/format";

export { fmtCompact, fmtInt, fmtMs, fmtTs, sumTokens } from "@/lib/format";

/** Human-readable column header / label for a group-by dimension. */
const DIMENSION_LABELS: Record<UsageGroupBy, string> = {
	source: "Source",
	model_id: "Model",
	host_id: "Host",
	policy_id: "Policy",
	relay_key_hash: "Key",
	host_key_id: "Credential",
	team_id: "Team",
	project_id: "Project",
	principal_id: "Principal",
	error_kind: "Error kind",
	finish_reason: "Finish reason",
	"extras.instance": "Instance",
};

export function dimensionLabel(groupBy: UsageGroupBy): string {
	return DIMENSION_LABELS[groupBy];
}

/** Ratio 0..1 → "1.2%" (more precision under 10%, none above). */
export function fmtPct(ratio: number): string {
	const pct = ratio * 100;
	const digits = pct > 0 && pct < 10 ? 1 : 0;
	return `${pct.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
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
			maximumFractionDigits: amount < 10 ? 2 : amount < 1000 ? 0 : 1,
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

/** Axis tick for a bucket: "Mon 14" for day buckets, "14:00" otherwise. */
export function fmtBucketTick(ts: string, interval: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return interval === "1d" ? fmtDay(d) : fmtClock(d);
}

/** Tooltip title for a bucket: the day, plus the time when under a day. */
export function fmtBucket(ts: string, interval: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return interval === "1d" ? fmtDay(d) : `${fmtDay(d)}, ${fmtClock(d)}`;
}

/** Buckets that start a local day: the ticks for an hourly axis spanning days. */
export function dayStartTicks(buckets: string[]): string[] {
	return buckets.filter((b) => {
		const d = new Date(b);
		return d.getHours() === 0 && d.getMinutes() === 0;
	});
}

function fmtDay(d: Date): string {
	return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${d.getDate()}`;
}

function fmtClock(d: Date): string {
	return d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
}

export function fmtRange(from: string, to: string): string {
	return `${fmtTs(from)} → ${fmtTs(to)}`;
}
