import { useMemo } from "react";
import { usePolicyBindingsOf } from "@/api/hooks/policyBindings";
import { useDraftReachQuery } from "@/api/hooks/reachable";
import {
	boundAccountIds,
	type DraftReachView,
	draftReachRequest,
	draftReachView,
	entryWarnings,
	type ReachChoice,
} from "@/policies/policyReach";

const NO_WARNINGS: ReadonlyMap<string, readonly string[]> = new Map();

/**
 * What a policy being drafted would reach: `owner` is its scope as `kind:id`
 * (or `system`), `entries` its picked model refs. An edited policy (`policyId`)
 * is read as the policy of the first account bound to it, since a share held
 * for one account serves only that account's lane. Never suspends; while the
 * read is out or failed the picker keeps the whole catalog and says why.
 */
export function useDraftReach({
	owner,
	policyId,
	choice,
	poolIds,
	entries,
}: {
	owner: string | undefined;
	policyId: string | undefined;
	choice: ReachChoice | undefined;
	poolIds: readonly string[];
	entries: readonly string[];
}): DraftReachView & { warnings: ReadonlyMap<string, readonly string[]> } {
	const bindings = usePolicyBindingsOf(policyId);
	const accountPending = Boolean(policyId) && bindings.isPending;
	const bound = policyId
		? boundAccountIds(bindings.data?.items ?? [], policyId)
		: [];
	const request = accountPending
		? undefined
		: draftReachRequest(owner, choice, poolIds, bound[0]);
	const { data, isError, isPlaceholderData } = useDraftReachQuery(request);
	const requested = request !== undefined;
	const otherBoundAccounts = Math.max(bound.length - 1, 0);
	// Kept apart from `entries`: the picker re-indexes the catalog whenever the
	// view's identity changes, which a pick alone shouldn't cause.
	const view = useMemo(
		() =>
			draftReachView({
				choice,
				poolIds,
				accountPending,
				requested,
				otherBoundAccounts,
				data,
				isError,
				isStale: isPlaceholderData,
			}),
		[
			choice,
			poolIds,
			accountPending,
			requested,
			otherBoundAccounts,
			data,
			isError,
			isPlaceholderData,
		],
	);
	return {
		...view,
		warnings: view.checked ? entryWarnings(entries, view.checked) : NO_WARNINGS,
	};
}
