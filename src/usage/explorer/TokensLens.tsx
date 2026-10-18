import { RANGE_COMPARE_LABELS } from "@/usage/format";
import { StackedUsageChart } from "@/usage/StackedUsageChart";
import { ExplorerTable } from "./ExplorerTable";
import { LensLayout } from "./LensLayout";
import { useExplorer } from "./useExplorer";
import { useRowActions } from "./useRowActions";
import { TOKENS_COLUMNS, useTokensLens } from "./useTokensLens";

export function TokensLens() {
	const { search, win, filter } = useExplorer();
	const actions = useRowActions();
	const { figures, meters, rows } = useTokensLens(
		search.group_by,
		win,
		filter,
		RANGE_COMPARE_LABELS[search.range],
	);
	return (
		<LensLayout
			figures={figures}
			chartTitle="Tokens by kind"
			chart={
				<StackedUsageChart
					data={meters}
					groupBy="source"
					metric="tokens"
					bare
					height="h-[280px]"
				/>
			}
			table={
				<ExplorerTable columns={TOKENS_COLUMNS} rows={rows} {...actions} />
			}
		/>
	);
}
