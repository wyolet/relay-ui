import { useMemo } from "react";
import { useDraftReachQuery } from "@/api/hooks/reachable";
import {
	type DraftReachView,
	draftReachRequest,
	draftReachView,
	entryWarnings,
	type ReachChoice,
} from "@/policies/policyReach";

const NO_WARNINGS: ReadonlyMap<string, string> = new Map();

/**
 * What a policy being drafted would reach: `owner` is its scope as `kind:id`
 * (or `system`), `entries` its picked model refs. Never suspends; while the
 * read is out or failed the picker keeps the whole catalog and says why.
 */
export function useDraftReach({
	owner,
	choice,
	poolIds,
	entries,
}: {
	owner: string | undefined;
	choice: ReachChoice | undefined;
	poolIds: readonly string[];
	entries: readonly string[];
}): DraftReachView & { warnings: ReadonlyMap<string, string> } {
	const request = draftReachRequest(owner, choice, poolIds);
	const { data, isError, isPlaceholderData } = useDraftReachQuery(request);
	const requested = request !== undefined;
	// Kept apart from `entries`: the picker re-indexes the catalog whenever the
	// view's identity changes, which a pick alone shouldn't cause.
	const view = useMemo(
		() =>
			draftReachView({
				choice,
				poolIds,
				requested,
				data,
				isError,
				isStale: isPlaceholderData,
			}),
		[choice, poolIds, requested, data, isError, isPlaceholderData],
	);
	return {
		...view,
		warnings: view.checked ? entryWarnings(entries, view.checked) : NO_WARNINGS,
	};
}
