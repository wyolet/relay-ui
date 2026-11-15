import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { DelayedFallback } from "@/shared/DelayedFallback";
import { FigureRow, FigureRowSkeleton } from "@/shared/FigureRow";
import { NO_TRAFFIC_ACTION, NoTraffic } from "@/shared/NoTraffic";
import { useWeekFigures } from "@/usage/useWeekFigures";
import type { WeekUsageScope } from "@/usage/weekUsageQueries";

interface Props {
	scope: WeekUsageScope;
	/** What the resource's traffic would show, said when it had none. */
	emptyBody: string;
}

/** A resource's last 7 days in headline figures, or one statement when it
 * had no traffic. */
export function WeekFigures(props: Props) {
	return (
		<Suspense
			fallback={
				<DelayedFallback>
					<FigureRowSkeleton trend />
				</DelayedFallback>
			}
		>
			<Figures {...props} />
		</Suspense>
	);
}

function Figures({ scope, emptyBody }: Props) {
	const { hasTraffic, figures } = useWeekFigures(scope);
	if (!hasTraffic) {
		return (
			<NoTraffic
				title="No traffic in the last 7 days"
				actions={
					<Link
						to="/logs"
						search={{ ...scope.filter, since: "30d" }}
						className={NO_TRAFFIC_ACTION}
					>
						Older requests in Logs →
					</Link>
				}
			>
				{emptyBody}
			</NoTraffic>
		);
	}
	return <FigureRow figures={figures} />;
}
