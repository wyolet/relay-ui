import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyRateLimitView,
	policyRateLimitsQueryOptions,
	type UnthrottledModel,
} from "@/api/hooks/policies";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { displayLabel } from "@/lib/displayLabel";

export type { PolicyRateLimitView, UnthrottledModel };

export interface PolicyRateLimits {
	/** Each linked rate limit with its display name; the slug when the caller can't list it. */
	rateLimits: (PolicyRateLimitView & { label: string })[];
	/** Granted models that no rate-limit covers (pass without throttling). */
	unthrottled: UnthrottledModel[];
}

/** Rate limits this policy links, plus the server-computed unthrottled models. */
export function usePolicyRateLimits(ref: string): PolicyRateLimits {
	const { data } = useSuspenseQuery(policyRateLimitsQueryOptions(ref));
	const { data: list } = useSuspenseQuery(rateLimitsListQueryOptions);
	const byId = new Map(
		(list.items ?? []).map((rl) => [rl.metadata.id, displayLabel(rl.metadata)]),
	);
	return {
		rateLimits: (data.rateLimits ?? []).map((row) => ({
			...row,
			label: byId.get(row.id) ?? row.name,
		})),
		unthrottled: data.unthrottled ?? [],
	};
}
