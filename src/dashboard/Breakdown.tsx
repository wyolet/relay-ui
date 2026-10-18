import { Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { ShareBar } from "@/shared/ShareBar";
import {
	BREAKDOWN_DIMENSIONS,
	type BreakdownDimension,
	useBreakdown,
} from "./useBreakdown";

const GRID =
	"grid grid-cols-[minmax(0,12rem)_minmax(4rem,1fr)_5rem_4.5rem] items-center gap-x-5 md:grid-cols-[minmax(0,14rem)_minmax(4rem,1fr)_5rem_4.5rem_5rem_5rem_5.5rem]";
const WIDE = "hidden md:block";

/** This week by model, host, team, project or key: one table, top rows by spend. */
export function Breakdown() {
	const [groupBy, setGroupBy] = useState<BreakdownDimension>("model_id");
	return (
		<Section
			title="Breakdown"
			meta="this week, by spend"
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
	const { rows, more, total } = useBreakdown(groupBy);
	if (rows.length === 0) {
		return <p className="text-label text-ink-2">No traffic this week.</p>;
	}
	return (
		<div className="grid">
			<div className={`${GRID} border-b border-rule pb-2 text-meta text-ink-3`}>
				<span>Name</span>
				<span>Share</span>
				<span className="text-right">Spend</span>
				<span className="text-right">Requests</span>
				<span className={`${WIDE} text-right`}>Failed</span>
				<span className={`${WIDE} text-right`}>Tokens</span>
				<span className={`${WIDE} text-right`}>vs last week</span>
			</div>
			{rows.map((r) => (
				<div
					key={r.key}
					className={`${GRID} border-b border-rule py-2.5 text-label tabular-nums`}
				>
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
			<div className="flex items-center justify-between pt-2.5 text-meta text-ink-3">
				<span>{total}</span>
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
