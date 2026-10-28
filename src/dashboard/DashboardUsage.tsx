import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { FigureRowSkeleton } from "@/shared/FigureRow";
import { NO_TRAFFIC_ACTION, NoTraffic } from "@/shared/NoTraffic";
import { Section, SectionSkeleton } from "@/shared/Section";
import { AttentionList } from "./AttentionList";
import { Breakdown } from "./Breakdown";
import { Headline } from "./Headline";
import { TrafficChart } from "./TrafficChart";
import { useDashboardTraffic } from "./useDashboardTraffic";
import { WeekFacts } from "./WeekFacts";
import { WeekHeatmap } from "./WeekHeatmap";

const SPLIT = "grid gap-14 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]";

function AttentionSection() {
	return (
		<Section title="Needs attention" meta="last 24h">
			<Suspense fallback={<p className="text-label text-ink-3">Checking…</p>}>
				<AttentionList />
			</Suspense>
		</Section>
	);
}

/** The period's usage blocks, or one statement when it had no traffic. Sits
 * under a single boundary so the blocks appear together. */
export function DashboardUsage() {
	const { hasTraffic, period } = useDashboardTraffic();

	if (!hasTraffic) {
		return (
			<div className={SPLIT}>
				<NoTraffic
					title={`No traffic ${period}`}
					actions={
						<>
							<Link to="/keys/new" className={NO_TRAFFIC_ACTION}>
								Issue a key →
							</Link>
							<Link to="/logs" className={NO_TRAFFIC_ACTION}>
								Open logs →
							</Link>
						</>
					}
				>
					Requests sent through this relay show up here: spend, tokens, the
					busiest hours and who sent them.
				</NoTraffic>
				<AttentionSection />
			</div>
		);
	}

	return (
		<div className="grid gap-14">
			<Headline />
			<WeekFacts />
			<div className={SPLIT}>
				<TrafficChart />
				<AttentionSection />
			</div>
			<WeekHeatmap />
			<Breakdown />
		</div>
	);
}

/** {@link DashboardUsage} while its first data loads, block for block. */
export function DashboardUsageSkeleton() {
	return (
		<div className="grid gap-14">
			<FigureRowSkeleton trend />
			<Section title="In numbers">
				<FigureRowSkeleton size="mini" />
			</Section>
			<div className={SPLIT}>
				<SectionSkeleton title="Traffic by model" height="h-[260px]" />
				<AttentionSection />
			</div>
			<SectionSkeleton title="Activity" height="h-[200px]" />
		</div>
	);
}
