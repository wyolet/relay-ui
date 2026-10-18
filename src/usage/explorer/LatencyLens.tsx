import { dimensionLabel } from "@/usage/format";
import { LatencyLines } from "@/usage/LatencyLines";
import { ExplorerTable } from "./ExplorerTable";
import { LensLayout } from "./LensLayout";
import { useExplorer } from "./useExplorer";
import { LATENCY_COLUMNS, useLatencyLens } from "./useLatencyLens";
import { useRowActions } from "./useRowActions";

export function LatencyLens() {
	const { search, win, filter } = useExplorer();
	const actions = useRowActions();
	const { figures, lines, rows } = useLatencyLens(search.group_by, win, filter);
	return (
		<LensLayout
			figures={figures}
			chartTitle={`p95 by ${dimensionLabel(search.group_by).toLowerCase()}`}
			chart={
				<LatencyLines
					points={lines.points}
					series={lines.series}
					groupBy={search.group_by}
					interval={win.interval}
					labels={lines.labels}
				/>
			}
			table={
				<ExplorerTable columns={LATENCY_COLUMNS} rows={rows} {...actions} />
			}
		/>
	);
}
