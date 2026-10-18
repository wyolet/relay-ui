import { dimensionLabel, RANGE_COMPARE_LABELS } from "@/usage/format";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { ExplorerTable } from "./ExplorerTable";
import { LensLayout } from "./LensLayout";
import { useExplorer } from "./useExplorer";
import { useRowActions } from "./useRowActions";
import { TRAFFIC_COLUMNS, useTrafficLens } from "./useTrafficLens";

export function TrafficLens() {
	const { search, win, filter } = useExplorer();
	const actions = useRowActions();
	const groupBy = search.group_by;
	const { figures, series, rows } = useTrafficLens(
		groupBy,
		win,
		filter,
		RANGE_COMPARE_LABELS[search.range],
	);
	return (
		<LensLayout
			figures={figures}
			chartTitle={`Requests by ${dimensionLabel(groupBy).toLowerCase()}`}
			chart={
				<StackedUsageChart
					data={series}
					groupBy={groupBy}
					metric="requests"
					bare
					height="h-[280px]"
				/>
			}
			table={
				<ExplorerTable columns={TRAFFIC_COLUMNS} rows={rows} {...actions} />
			}
		/>
	);
}
