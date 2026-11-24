import { useQuery } from "@tanstack/react-query";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { pseudoLimitsCurrentQuery } from "@/api/hooks/pseudoLimits";
import { failureMessage } from "@/hooks/useWriteRunner";
import { displayLabel } from "@/lib/displayLabel";
import { isPolicySetAbove } from "@/limits/limitRefusal";
import { currentCaseLine, type LimitTarget } from "@/limits/limitWrites";
import { pseudoTarget } from "@/limits/pseudoLimitsBody";

/** The target's policy as relay states it; `unknown` leaves the form's own reading of it. */
export type LimitCurrent =
	| { status: "unknown" }
	| { status: "loading" }
	| { status: "above"; message: string }
	| { status: "known"; line: string };

/**
 * What the target is under now, from a dry run with no limit while relay serves
 * the one-request kind. It asks only while `asking`, so a save never re-asks.
 */
export function useLimitCurrent(
	target: LimitTarget,
	served: boolean,
	asking: boolean,
): LimitCurrent {
	const current = useQuery({
		...pseudoLimitsCurrentQuery(pseudoTarget(target)),
		enabled: served && asking,
	});
	const policies = useQuery(policiesListQueryOptions);
	if (!served) return { status: "unknown" };
	if (current.data) {
		const policy = current.data.current?.policy;
		const visible = policies.data?.items?.find(
			(p) => p.metadata.id === policy?.id,
		);
		const label = visible ? displayLabel(visible.metadata) : policy?.name;
		return {
			status: "known",
			line: currentCaseLine(current.data.case, label, target.label),
		};
	}
	if (current.isError) {
		return isPolicySetAbove(current.error)
			? { status: "above", message: failureMessage(current.error) }
			: { status: "unknown" };
	}
	return { status: "loading" };
}
