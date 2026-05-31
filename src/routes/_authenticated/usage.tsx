import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import {
	USAGE_GROUP_BY,
	USAGE_INTERVALS,
	usageSummaryQueryOptions,
	usageTimeseriesQueryOptions,
	useUsageOverview,
} from "@/api/hooks/usage";
import { PageLoader } from "@/shared/Spinner";
import { dimensionLabel } from "@/usage/format";
import { UsageStatCards } from "@/usage/UsageStatCards";
import { UsageTimelineChart } from "@/usage/UsageTimelineChart";
import { UsageTopGroups } from "@/usage/UsageTopGroups";

const searchSchema = z.object({
	group_by: z.enum(USAGE_GROUP_BY).default("model_id"),
	interval: z.enum(USAGE_INTERVALS).default("1h"),
});

export const Route = createFileRoute("/_authenticated/usage")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		const { queryClient } = context;
		void queryClient.ensureQueryData(usageSummaryQueryOptions(deps.group_by));
		void queryClient.ensureQueryData(
			usageTimeseriesQueryOptions(deps.interval, "source"),
		);
	},
	component: UsagePage,
});

function UsagePage() {
	const { group_by, interval } = Route.useSearch();
	const navigate = useNavigate();

	const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
		void navigate({ to: "/usage", search: { group_by, interval, ...patch } });

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

			<Suspense fallback={<Loading />}>
				<KpiHeader groupBy={group_by} />
			</Suspense>

			<div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1.4fr_1fr]">
				<section className="flex flex-col gap-2">
					<SectionHeader title="Over time">
						<Picker
							label="Interval"
							value={interval}
							options={USAGE_INTERVALS}
							onChange={(v) => setSearch({ interval: v })}
						/>
					</SectionHeader>
					<Suspense fallback={<Loading />}>
						<UsageTimelineChart interval={interval} />
					</Suspense>
				</section>

				<section className="flex flex-col gap-2">
					<SectionHeader title="Breakdown">
						<Picker
							label="Group by"
							value={group_by}
							options={USAGE_GROUP_BY}
							optionLabel={dimensionLabel}
							onChange={(v) => setSearch({ group_by: v })}
						/>
					</SectionHeader>
					<Suspense fallback={<Loading />}>
						<UsageTopGroups groupBy={group_by} />
					</Suspense>
				</section>
			</div>
		</div>
	);
}

/** KPI cards share the summary query with the breakdown; group_by doesn't
 * change the aggregate totals, so the cards are stable across dimensions. */
function KpiHeader({
	groupBy,
}: {
	groupBy: z.infer<typeof searchSchema>["group_by"];
}) {
	const { kpis } = useUsageOverview(groupBy);
	return <UsageStatCards kpis={kpis} />;
}

function SectionHeader({
	title,
	children,
}: {
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-sm font-medium text-foreground">{title}</h2>
			{children}
		</div>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card">
			<PageLoader />
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
