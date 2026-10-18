import { dimensionLabel, RANGE_COMPARE_LABELS } from "@/usage/format";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { ExplorerTable } from "./ExplorerTable";
import { LensLayout } from "./LensLayout";
import { useExplorer } from "./useExplorer";
import { useRowActions } from "./useRowActions";
import { SPEND_COLUMNS, useSpendLens } from "./useSpendLens";

export function SpendLens() {
	const { search, win, filter } = useExplorer();
	const actions = useRowActions();
	const groupBy = search.group_by;
	const { figures, series, rows } = useSpendLens(
		groupBy,
		win,
		filter,
		RANGE_COMPARE_LABELS[search.range],
	);
	return (
		<LensLayout
			figures={figures}
			chartTitle={`Spend by ${dimensionLabel(groupBy).toLowerCase()}`}
			chart={
				<StackedUsageChart
					data={series}
					groupBy={groupBy}
					metric="cost"
					bare
					height="h-[280px]"
				/>
			}
			table={<ExplorerTable columns={SPEND_COLUMNS} rows={rows} {...actions} />}
		/>
	);
}
