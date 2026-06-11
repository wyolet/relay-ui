import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ScrollText } from "lucide-react";
import { Suspense } from "react";
import type { DateRange } from "react-day-picker";
import { z } from "zod";
import {
	resolveWindow,
	type StackableMetric,
	stackedTimeseriesQueryOptions,
	USAGE_GROUP_BY,
	USAGE_METRICS,
	USAGE_RANGE_LABELS,
	USAGE_RANGES,
	type UsageGroupBy,
	type UsageRange,
	type UsageWindow,
	usageComparisonWindows,
	usageSummaryQueryOptions,
	usageTotalsQueryOptions,
	useStackedTimeline,
	useUsageOverviewWithDeltas,
} from "@/api/hooks/usage";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageLoader } from "@/shared/Spinner";
import { CostChart } from "@/usage/CostChart";
import { CostKpiCard } from "@/usage/CostKpiCard";
import { dimensionLabel, RANGE_COMPARE_LABELS } from "@/usage/format";
import { LatencyProfileCard } from "@/usage/LatencyProfileCard";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { TokenSplitCard } from "@/usage/TokenSplitCard";
import { UsageStatCards } from "@/usage/UsageStatCards";
import { UsageTopGroups } from "@/usage/UsageTopGroups";

const searchSchema = z.object({
	group_by: z.enum(USAGE_GROUP_BY).default("model_id"),
	range: z.enum(USAGE_RANGES).default("week"),
	metric: z.enum(USAGE_METRICS).default("requests"),
	from: z.string().optional(),
	to: z.string().optional(),
});

type UsageSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/usage")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		const { queryClient } = context;
		const win = resolveWindow(deps.range, deps.from, deps.to);
		// Same windows the KPI/leaderboard hooks derive → same cache entries.
		const { previous } = usageComparisonWindows(win);
		void queryClient.ensureQueryData(
			usageSummaryQueryOptions(deps.group_by, win),
		);
		void queryClient.ensureQueryData(
			usageSummaryQueryOptions(deps.group_by, previous),
		);
		void queryClient.ensureQueryData(
			stackedTimeseriesQueryOptions(deps.group_by, win),
		);
		void queryClient.ensureQueryData(usageTotalsQueryOptions(win));
	},
	component: UsagePage,
});

function UsagePage() {
	const search = Route.useSearch();
	const { group_by, range } = search;
	const navigate = useNavigate();

	const setSearch = (patch: Partial<UsageSearch>) =>
		void navigate({ to: "/usage", search: { ...search, ...patch } });

	// One window for KPIs + leaderboard, matching the chart's (which resolves
	// the same inputs inside useStackedTimeline).
	const win: UsageWindow = resolveWindow(range, search.from, search.to);
	const metric = search.metric;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Usage</h1>
					<p className="text-xs text-muted-foreground">
						Traffic, errors, and latency across the relay.
					</p>
				</div>
				<Link
					to="/logs"
					className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
				>
					<ScrollText className="w-3.5 h-3.5" aria-hidden />
					Inspect requests
				</Link>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<RangePicker
					range={range}
					from={search.from}
					to={search.to}
					onRange={(r) => setSearch({ range: r })}
					onCustom={(from, to) => setSearch({ range: "custom", from, to })}
				/>
				<div className="flex flex-wrap items-center gap-3">
					<Segmented
						value={metric}
						options={USAGE_METRICS}
						optionLabel={(m) =>
							m === "tokens" ? "Tokens" : m === "cost" ? "Cost" : "Requests"
						}
						onChange={(m) => setSearch({ metric: m })}
					/>
					<div className="h-5 w-px bg-border" aria-hidden />
					<span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						Split by
						<DimensionSelect
							value={group_by}
							onChange={(v) => setSearch({ group_by: v })}
						/>
					</span>
				</div>
			</div>

			<Suspense fallback={<Loading />}>
				<KpiHeader groupBy={group_by} win={win} range={range} />
			</Suspense>

			{/* items-start: without it the grid stretches the chart card to the
			    leaderboard's height, so the chart appears to resize as the
			    leaderboard grows/shrinks. */}
			<div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
				<Suspense fallback={<Loading />}>
					{metric === "cost" ? (
						<CostChart
							groupBy={group_by}
							range={range}
							from={search.from}
							to={search.to}
						/>
					) : (
						<Chart search={search} metric={metric} />
					)}
				</Suspense>
				<Suspense fallback={<Loading />}>
					<UsageTopGroups groupBy={group_by} win={win} />
				</Suspense>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Suspense fallback={<Loading />}>
					<LatencyProfileCard win={win} />
				</Suspense>
				<Suspense fallback={<Loading />}>
					<TokenSplitCard groupBy={group_by} win={win} />
				</Suspense>
			</div>
		</div>
	);
}

/** Group-by dimension chooser (shadcn Select for consistent chrome). */
function DimensionSelect({
	value,
	onChange,
}: {
	value: UsageGroupBy;
	onChange: (v: UsageGroupBy) => void;
}) {
	const items = USAGE_GROUP_BY.map((o) => ({
		label: dimensionLabel(o),
		value: o,
	}));
	return (
		<Select
			items={items}
			value={value}
			onValueChange={(v) => onChange(v as UsageGroupBy)}
		>
			<SelectTrigger size="sm" className="text-xs">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((o) => (
					<SelectItem key={o.value} value={o.value} className="text-xs">
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function Chart({
	search,
	metric,
}: {
	search: UsageSearch;
	metric: StackableMetric;
}) {
	const data = useStackedTimeline(
		search.group_by,
		search.range,
		metric,
		search.from,
		search.to,
	);
	return (
		<StackedUsageChart data={data} groupBy={search.group_by} metric={metric} />
	);
}

/** KPI cards share the summary query with the breakdown; group_by doesn't
 * change the aggregate totals, so the cards are stable across dimensions. */
function KpiHeader({
	groupBy,
	win,
	range,
}: {
	groupBy: UsageGroupBy;
	win: UsageWindow;
	range: UsageRange;
}) {
	const { kpis, deltas } = useUsageOverviewWithDeltas(groupBy, win);
	return (
		<UsageStatCards
			kpis={kpis}
			deltas={deltas}
			compareLabel={RANGE_COMPARE_LABELS[range]}
			cost={
				// Own Suspense with a null fallback: the cost fan-out streams in
				// without ever blocking the four instant cards.
				<Suspense fallback={null}>
					<CostKpiCard win={win} compareLabel={RANGE_COMPARE_LABELS[range]} />
				</Suspense>
			}
		/>
	);
}

/** Preset range buttons + a custom date-range expander. */
function RangePicker({
	range,
	from,
	to,
	onRange,
	onCustom,
}: {
	range: UsageRange;
	from?: string;
	to?: string;
	onRange: (r: UsageRange) => void;
	onCustom: (from: string, to: string) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Segmented
				value={range}
				options={USAGE_RANGES}
				optionLabel={(r) => USAGE_RANGE_LABELS[r]}
				onChange={onRange}
			/>
			{range === "custom" && (
				<CustomRangePopover from={from} to={to} onCustom={onCustom} />
			)}
		</div>
	);
}

/** Calendar range picker (shadcn) behind a popover; emits ISO from/to. */
function CustomRangePopover({
	from,
	to,
	onCustom,
}: {
	from?: string;
	to?: string;
	onCustom: (from: string, to: string) => void;
}) {
	const selected: DateRange | undefined = from
		? { from: new Date(from), to: to ? new Date(to) : undefined }
		: undefined;

	const label = selected?.from
		? `${selected.from.toLocaleDateString()} – ${
				selected.to?.toLocaleDateString() ?? "…"
			}`
		: "Pick dates";

	function handleSelect(next: DateRange | undefined) {
		if (!next?.from) return;
		// Span the full days: start of `from` to end of `to` (or `from`).
		const start = new Date(next.from);
		start.setHours(0, 0, 0, 0);
		const end = new Date(next.to ?? next.from);
		end.setHours(23, 59, 59, 999);
		onCustom(start.toISOString(), end.toISOString());
	}

	return (
		<Popover>
			<PopoverTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted">
				<CalendarDays
					className="h-3.5 w-3.5 text-muted-foreground"
					aria-hidden
				/>
				{label}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-auto p-0">
				<Calendar
					mode="range"
					numberOfMonths={2}
					defaultMonth={selected?.from}
					selected={selected}
					onSelect={handleSelect}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

/** Single-select segmented control on shadcn ToggleGroup (base-ui). */
function Segmented<T extends string>({
	value,
	options,
	optionLabel,
	onChange,
}: {
	value: T;
	options: readonly T[];
	optionLabel: (v: T) => string;
	onChange: (v: T) => void;
}) {
	return (
		<ToggleGroup
			variant="outline"
			size="default"
			value={[value]}
			onValueChange={(next: string[]) => {
				const picked = next.find((v) => v !== value) ?? next[0];
				if (picked) onChange(picked as T);
			}}
		>
			{options.map((o) => (
				<ToggleGroupItem key={o} value={o} className="px-2.5 text-xs">
					{optionLabel(o)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card">
			<PageLoader />
		</div>
	);
}
