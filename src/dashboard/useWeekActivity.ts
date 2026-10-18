import { daySliceStarts } from "@/lib/usage-math/window";
import type { HeatRow } from "@/shared/HourHeatmap";
import type { DashboardMetric } from "@/stores/dashboard";
import { fmtCompact, fmtMoneyCompact } from "@/usage/format";
import {
	pointTotals,
	useDashboardWindow,
	useMetricSeries,
} from "./useDashboardWindow";

const HOURS = 24;
const LEVELS = 5;
const HOUR_MS = 3_600_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

interface Day {
	key: string;
	label: string;
	/** Start of each hour cell; undefined for weekday rows. */
	hourStart?: (h: number) => number;
	counts: number[];
}

function dateRows(midnights: number[]): Day[] {
	return midnights.map((midnight) => {
		const date = new Date(midnight);
		return {
			key: String(midnight),
			label: `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`,
			hourStart: (h) => new Date(midnight).setHours(h),
			counts: new Array<number>(HOURS).fill(0),
		};
	});
}

function weekdayRows(): Day[] {
	return WEEKDAYS.map((label) => ({
		key: label,
		label,
		counts: new Array<number>(HOURS).fill(0),
	}));
}

/** Spend or tokens per hour: a row per day, or per weekday over a month so
 * the grid stays seven rows tall. Hours outside the period stay blank. */
export function useWeekActivity(metric: DashboardMetric): {
	rows: HeatRow[];
	hours: string[];
} {
	const dw = useDashboardWindow();
	const values = pointTotals(useMetricSeries(metric, dw.hourly));
	const byWeekday = dw.range === "month";
	const fromMs = Date.parse(dw.hourly.from);

	const days = byWeekday
		? weekdayRows()
		: dateRows(daySliceStarts(dw.hourly, false));
	const rowByKey = new Map(days.map((d) => [d.key, d]));
	for (const { at, value } of values) {
		const date = new Date(at);
		const key = byWeekday
			? (WEEKDAYS[weekdayIndex(date)] ?? "")
			: String(new Date(at).setHours(0, 0, 0, 0));
		const day = rowByKey.get(key);
		if (day) day.counts[date.getHours()] += value;
	}

	const fmt =
		metric === "cost"
			? (n: number) => fmtMoneyCompact(n, "USD")
			: (n: number) => `${fmtCompact(n)} tokens`;
	// Log steps: one runaway hour must not flatten every other hour to step 1.
	// Spend steps by the cent so small amounts still register.
	const unit = metric === "cost" ? 100 : 1;
	const logMax = Math.log1p(
		Math.max(1, unit * Math.max(0, ...days.flatMap((d) => d.counts))),
	);
	const level = (n: number) =>
		n <= 0
			? 0
			: Math.max(1, Math.ceil((Math.log1p(n * unit) / logMax) * LEVELS));

	const now = new Date(dw.nowMs);
	const rows = days.map((d) => ({
		key: d.key,
		day: d.label,
		cells: d.counts.map((n, h) => {
			const start = d.hourStart?.(h);
			return {
				key: String(h),
				level: level(n),
				value: fmt(n),
				when: `${start === undefined ? `${d.label}s` : d.label} · ${hh(h)}`,
				current:
					start === undefined
						? d.label === WEEKDAYS[weekdayIndex(now)] && h === now.getHours()
						: start <= dw.nowMs && dw.nowMs < start + HOUR_MS,
				outside:
					start !== undefined &&
					(start + HOUR_MS <= fromMs || start > dw.nowMs),
			};
		}),
		total: metric === "cost" ? fmt(sum(d.counts)) : fmtCompact(sum(d.counts)),
	}));
	const hours = Array.from({ length: HOURS }, (_, h) =>
		h % 3 === 0 ? String(h).padStart(2, "0") : "",
	);
	return { rows, hours };
}
