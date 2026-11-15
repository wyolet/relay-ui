import { WeekFigures } from "@/usage/WeekFigures";
import { WeekTraffic } from "@/usage/WeekTraffic";
import type { WeekUsageScope } from "@/usage/weekUsageQueries";

/** A resource's last 7 days: its figures with the traffic chart below. */
export function WeekUsage({
	scope,
	emptyBody,
}: {
	scope: WeekUsageScope;
	emptyBody: string;
}) {
	return (
		<div className="grid grid-cols-1 gap-12">
			<WeekFigures scope={scope} emptyBody={emptyBody} />
			<WeekTraffic scope={scope} />
		</div>
	);
}
