import { useSuspenseQuery } from "@tanstack/react-query";
import { displayLabel } from "@/lib/displayLabel";
import { fmtInt, fmtLogTime, fmtMs, fmtTs, sumTokens } from "@/logs/format";
import { isErrorEvent } from "@/logs/predicates";
import { statusDot, statusTone } from "@/logs/statusStyle";
import { useModelWeekQueries } from "@/models/modelWeekQueries";
import { useModelHosts } from "@/models/useModelHosts";

/** One logged request as the model page lists it. */
export interface RecentRequest {
	id: string;
	time: string;
	timeTitle: string;
	status: number;
	statusTone: string;
	statusDot: string;
	host: string;
	key: string;
	/** The finish reason, or for a failure its error kind. */
	outcome: string;
	latency: string;
	tokens: string;
}

/** The model's newest requests of the last 7 days, hosts named. */
export function useModelRecentRequests(
	modelName: string,
	modelId: string,
): RecentRequest[] {
	const { data } = useSuspenseQuery(useModelWeekQueries(modelId).recent);
	const hostLabels = new Map(
		useModelHosts(modelName).map((r) => [r.host.id, displayLabel(r.host)]),
	);
	return data.map((e) => {
		const failed = isErrorEvent(e);
		return {
			id: e.request_id,
			time: fmtLogTime(e.ts),
			timeTitle: fmtTs(e.ts),
			status: e.status,
			statusTone: statusTone(e.status, failed),
			statusDot: statusDot(e.status, failed),
			host: (e.host_id && hostLabels.get(e.host_id)) || e.host_id || "—",
			key: e.relay_key || "—",
			outcome: (failed ? e.error_kind : e.finish_reason) || "—",
			latency: fmtMs(e.duration_ms),
			tokens: fmtInt(sumTokens(e.tokens)),
		};
	});
}
