import { BarChart3 } from "lucide-react";
import {
	type UsageGroupBy,
	type UsageSummaryRow,
	useUsageSummary,
} from "@/api/hooks/usage";
import {
	dimensionLabel,
	fmtInt,
	fmtMs,
	fmtRange,
	fmtTs,
	groupValue,
	sumTokens,
} from "./format";
import { UsageEmpty } from "./UsageEmpty";

export function UsageSummaryTable({ groupBy }: { groupBy: UsageGroupBy }) {
	const { data } = useUsageSummary(groupBy);
	const rows = data.rows ?? [];

	if (rows.length === 0) {
		return (
			<UsageEmpty
				icon={BarChart3}
				title="No usage yet"
				body={`Once traffic flows through the relay, totals will appear here grouped by ${dimensionLabel(
					groupBy,
				).toLowerCase()} — requests, errors, latency percentiles, and tokens.`}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtRange(data.from, data.to)} · {rows.length} group
				{rows.length === 1 ? "" : "s"}
			</div>
			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full border-collapse text-sm">
					<thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>{dimensionLabel(groupBy)}</Th>
							<Th className="text-right">Requests</Th>
							<Th className="text-right">Errors</Th>
							<Th className="text-right">p50</Th>
							<Th className="text-right">p95</Th>
							<Th className="text-right">p99</Th>
							<Th className="text-right">Tokens</Th>
							<Th>First seen</Th>
							<Th>Last seen</Th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<Row
								key={groupValue(row.group, groupBy)}
								row={row}
								groupBy={groupBy}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function Row({
	row,
	groupBy,
}: {
	row: UsageSummaryRow;
	groupBy: UsageGroupBy;
}) {
	return (
		<tr className="border-t border-border hover:bg-muted/30">
			<Td>
				<code className="font-mono text-xs text-foreground break-all">
					{groupValue(row.group, groupBy)}
				</code>
			</Td>
			<Td className="text-right tabular-nums">{fmtInt(row.requests)}</Td>
			<Td className="text-right tabular-nums">
				<span
					className={
						row.error_count > 0 ? "text-destructive" : "text-muted-foreground"
					}
				>
					{fmtInt(row.error_count)}
				</span>
			</Td>
			<Td className="text-right tabular-nums text-muted-foreground">
				{fmtMs(row.duration_ms.p50)}
			</Td>
			<Td className="text-right tabular-nums text-muted-foreground">
				{fmtMs(row.duration_ms.p95)}
			</Td>
			<Td className="text-right tabular-nums text-muted-foreground">
				{fmtMs(row.duration_ms.p99)}
			</Td>
			<Td className="text-right tabular-nums">
				{fmtInt(sumTokens(row.tokens))}
			</Td>
			<Td className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
				{fmtTs(row.first_seen)}
			</Td>
			<Td className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
				{fmtTs(row.last_seen)}
			</Td>
		</tr>
	);
}

function Th({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-2 font-medium ${className || "text-left"}`}
		>
			{children}
		</th>
	);
}

function Td({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
