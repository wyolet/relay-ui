import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	type FigureData,
	FigureRow,
	FigureRowSkeleton,
} from "@/shared/FigureRow";
import { NO_TRAFFIC_ACTION, NoTraffic } from "@/shared/NoTraffic";
import { Section, SectionSkeleton } from "@/shared/Section";
import { StaleContent } from "@/shared/StaleContent";
import { clearFilters } from "./search";
import { useExplorer } from "./useExplorer";
import { useLensTraffic } from "./useLensTraffic";

/** Every lens has the same rhythm: figures, a chart, then the table. A slice
 * with no traffic gets one statement instead. */
export function LensLayout({
	figures,
	chartTitle,
	chart,
	extra,
	table,
}: {
	figures: FigureData[];
	chartTitle: string;
	chart: ReactNode;
	/** Sections between the chart and the table. */
	extra?: ReactNode;
	table: ReactNode;
}) {
	const { stale } = useExplorer();
	const { hasTraffic, filtered, period } = useLensTraffic();
	return (
		<StaleContent stale={stale}>
			{hasTraffic ? (
				<div className="grid gap-14">
					<FigureRow figures={figures} />
					<Section title={chartTitle}>{chart}</Section>
					{extra}
					<Section title="Breakdown">{table}</Section>
				</div>
			) : filtered ? (
				<NoTraffic
					title="No traffic matches these filters"
					actions={
						<Link
							from="/usage"
							to="."
							search={clearFilters}
							className={NO_TRAFFIC_ACTION}
						>
							Clear filters →
						</Link>
					}
				>
					Nothing was sent {period} by the slice the filters describe. Clear
					them, or pick a wider range.
				</NoTraffic>
			) : (
				<NoTraffic
					title={`No traffic ${period}`}
					actions={
						<Link to="/logs" className={NO_TRAFFIC_ACTION}>
							Open logs →
						</Link>
					}
				>
					Requests sent through this relay show up here, split by model, host,
					team, project or key.
				</NoTraffic>
			)}
		</StaleContent>
	);
}

/** A lens while its first data loads. */
export function LensSkeleton() {
	return (
		<div className="grid gap-14">
			<FigureRowSkeleton />
			<SectionSkeleton height="h-[280px]" />
		</div>
	);
}
