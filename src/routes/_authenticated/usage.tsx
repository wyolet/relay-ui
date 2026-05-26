import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, BarChart3, ListOrdered } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import {
	USAGE_GROUP_BY,
	USAGE_INTERVALS,
	usageEventsInfiniteQueryOptions,
	usageSummaryQueryOptions,
	usageTimeseriesQueryOptions,
} from "@/api/hooks/usage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dimensionLabel } from "@/usage/format";
import { UsageChart } from "@/usage/UsageChart";
import { UsageEventsTable } from "@/usage/UsageEventsTable";
import { UsageSummaryTable } from "@/usage/UsageSummaryTable";

const TABS = ["summary", "timeline", "events"] as const;
type UsageTab = (typeof TABS)[number];

const searchSchema = z.object({
	tab: z.enum(TABS).default("summary"),
	group_by: z.enum(USAGE_GROUP_BY).default("source"),
	interval: z.enum(USAGE_INTERVALS).default("1h"),
});

export const Route = createFileRoute("/_authenticated/usage")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		const { queryClient } = context;
		// Warm the active tab's data so first paint isn't a spinner.
		if (deps.tab === "summary")
			void queryClient.ensureQueryData(usageSummaryQueryOptions(deps.group_by));
		else if (deps.tab === "timeline")
			void queryClient.ensureQueryData(
				usageTimeseriesQueryOptions(deps.interval, deps.group_by),
			);
		else
			void queryClient.ensureInfiniteQueryData(
				usageEventsInfiniteQueryOptions(),
			);
	},
	component: UsagePage,
});

const TAB_META: Record<UsageTab, { label: string; icon: typeof Activity }> = {
	summary: { label: "Summary", icon: BarChart3 },
	timeline: { label: "Timeline", icon: Activity },
	events: { label: "Events", icon: ListOrdered },
};

function UsagePage() {
	const { tab, group_by, interval } = Route.useSearch();
	const navigate = useNavigate();

	const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
		void navigate({
			to: "/usage",
			search: { tab, group_by, interval, ...patch },
		});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-semibold text-foreground">Usage</h1>
				<div className="flex items-center gap-3">
					{tab === "timeline" && (
						<Picker
							label="Interval"
							value={interval}
							options={USAGE_INTERVALS}
							onChange={(v) => setSearch({ interval: v })}
						/>
					)}
					{tab !== "events" && (
						<Picker
							label="Group by"
							value={group_by}
							options={USAGE_GROUP_BY}
							optionLabel={dimensionLabel}
							onChange={(v) => setSearch({ group_by: v })}
						/>
					)}
				</div>
			</div>

			<Tabs
				value={tab}
				onValueChange={(v) => {
					const next = TABS.find((t) => t === v);
					if (next) setSearch({ tab: next });
				}}
			>
				<TabsList variant="underline">
					{TABS.map((value) => {
						const { label, icon: Icon } = TAB_META[value];
						return (
							<TabsTrigger key={value} value={value} className="px-3 h-9">
								<Icon className="w-3.5 h-3.5" aria-hidden />
								{label}
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value="summary">
					<Suspense fallback={<Loading />}>
						<UsageSummaryTable groupBy={group_by} />
					</Suspense>
				</TabsContent>
				<TabsContent value="timeline">
					<Suspense fallback={<Loading />}>
						<UsageChart interval={interval} groupBy={group_by} />
					</Suspense>
				</TabsContent>
				<TabsContent value="events">
					<Suspense fallback={<Loading />}>
						<UsageEventsTable />
					</Suspense>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function Loading() {
	return (
		<div className="py-8 text-center text-sm text-muted-foreground">
			Loading…
		</div>
	);
}

function Picker<T extends string>({
	label,
	value,
	options,
	optionLabel,
	onChange,
}: {
	label: string;
	value: T;
	options: readonly T[];
	optionLabel?: (v: T) => string;
	onChange: (v: T) => void;
}) {
	return (
		<label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
			{label}
			<select
				value={value}
				onChange={(e) => {
					// select value is the same string union as `options`
					const next = options.find((o) => o === e.target.value);
					if (next) onChange(next);
				}}
				className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground"
			>
				{options.map((o) => (
					<option key={o} value={o}>
						{optionLabel ? optionLabel(o) : o}
					</option>
				))}
			</select>
		</label>
	);
}
