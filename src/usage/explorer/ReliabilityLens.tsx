import { RankList } from "@/shared/RankList";
import { Section } from "@/shared/Section";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { ExplorerTable } from "./ExplorerTable";
import { LensLayout } from "./LensLayout";
import { useExplorer } from "./useExplorer";
import { RELIABILITY_COLUMNS, useReliabilityLens } from "./useReliabilityLens";
import { useRowActions } from "./useRowActions";

export function ReliabilityLens() {
	const { search, win, filter } = useExplorer();
	const actions = useRowActions();
	const { figures, timeline, hasErrors, rows, errorKinds, finishReasons } =
		useReliabilityLens(search.group_by, win, filter);
	return (
		<LensLayout
			figures={figures}
			chartTitle="Errors over time"
			chart={
				hasErrors ? (
					<StackedUsageChart
						data={timeline}
						groupBy="source"
						metric="requests"
						bare
						height="h-[240px]"
					/>
				) : (
					<p className="text-label text-ink-2">
						No failed requests in this range.
					</p>
				)
			}
			extra={
				<div className="grid gap-14 lg:grid-cols-2">
					<Section title="Error kinds" meta="failed requests">
						<RankList rows={errorKinds} empty="No failures." />
					</Section>
					<Section title="Finish reasons" meta="all requests">
						<RankList rows={finishReasons} empty="No finished requests." />
					</Section>
				</div>
			}
			table={
				<ExplorerTable columns={RELIABILITY_COLUMNS} rows={rows} {...actions} />
			}
		/>
	);
}
