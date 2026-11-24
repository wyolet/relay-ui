import { Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { Facts } from "@/shared/Facts";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { ShareBar } from "@/shared/ShareBar";
import {
	TABLE_EMPTY,
	TABLE_FOOT,
	TABLE_HEAD_ROW,
	TABLE_ROW,
	WIDE,
} from "./tableRows";
import {
	BREAKDOWN_DIMENSIONS,
	type BreakdownDimension,
	useBreakdown,
} from "./useBreakdown";
import { useDashboardWindow } from "./useDashboardWindow";

const GRID =
	"grid grid-cols-[minmax(0,12rem)_minmax(4rem,1fr)_5rem_4.5rem] items-center gap-x-5 md:grid-cols-[minmax(0,14rem)_minmax(4rem,1fr)_5rem_4.5rem_5rem_5rem_6.5rem]";

/** The period by model, host, team, project or key: one table, top rows by spend. */
export function Breakdown() {
	const [groupBy, setGroupBy] = useState<BreakdownDimension>("model_id");
	const { period } = useDashboardWindow();
	return (
		<Section
			title="Breakdown"
			meta={`${period}, by spend`}
			aside={
				<Segmented
					variant="underline"
					value={groupBy}
					onChange={setGroupBy}
					options={BREAKDOWN_DIMENSIONS}
				/>
			}
		>
			<Suspense fallback={<div className="h-64" />}>
				<BreakdownTable groupBy={groupBy} />
			</Suspense>
		</Section>
	);
}

function BreakdownTable({ groupBy }: { groupBy: BreakdownDimension }) {
	const { rows, more, totals } = useBreakdown(groupBy);
	const { period, vs } = useDashboardWindow();
	if (rows.length === 0) {
		return <p className={TABLE_EMPTY}>No traffic {period}.</p>;
	}
	return (
		<div className="grid">
			<div className={`${GRID} ${TABLE_HEAD_ROW}`}>
				<span>Name</span>
				<span>Share</span>
				<span className="text-right">Spend</span>
				<span className="text-right">Requests</span>
				<span className={`${WIDE} text-right`}>Failed</span>
				<span className={`${WIDE} text-right`}>Tokens</span>
				<span className={`${WIDE} text-right`}>{vs}</span>
			</div>
			{rows.map((r) => (
				<div key={r.key} className={`${GRID} ${TABLE_ROW}`}>
					<span className="truncate text-foreground" title={r.label}>
						{r.label}
					</span>
					<ShareBar share={r.share} lead={r.lead} />
					<span className="text-right font-medium text-foreground">
						{r.spend}
					</span>
					<span className="text-right text-ink-2">{r.requests}</span>
					<span className={`${WIDE} text-right text-ink-2`}>{r.failed}</span>
					<span className={`${WIDE} text-right text-ink-2`}>{r.tokens}</span>
					<span className={`${WIDE} text-right text-ink-3`}>{r.change}</span>
				</div>
			))}
			<div className={`${TABLE_FOOT} justify-between`}>
				<Facts items={totals} />
				<Link
					to="/usage"
					search={{ group_by: groupBy }}
					className="hover:text-foreground"
				>
					{more > 0 ? `${more} more in Usage →` : "Open in Usage →"}
				</Link>
			</div>
		</div>
	);
}
