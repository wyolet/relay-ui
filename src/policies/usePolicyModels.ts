import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyModelExclusion,
	type PolicyModelView,
	policyModelsDebugQueryOptions,
	policyModelsQueryOptions,
} from "@/api/hooks/policies";
import { distinctModelCount } from "@/policies/policyReachRows";

export type { PolicyModelExclusion, PolicyModelView };

/** Models this policy grants (resolved server-side), with effective limits. */
export function usePolicyModels(ref: string): PolicyModelView[] {
	const { data } = useSuspenseQuery(policyModelsQueryOptions(ref));
	return data.models ?? [];
}

/** How many distinct models the policy grants, however many hosts serve each. */
export function usePolicyModelCount(ref: string): number {
	return distinctModelCount(usePolicyModels(ref));
}

/**
 * Models the policy does NOT grant, with the reason — fetched lazily via
 * `?debug=true`. The query stays disabled until `enabled` flips true, so the
 * default Models view never pays for it.
 */
export function usePolicyExcludedModels(ref: string, enabled: boolean) {
	const query = useQuery({
		...policyModelsDebugQueryOptions(ref),
		enabled,
	});
	return {
		excluded: query.data?.excluded ?? [],
		isLoading: query.isLoading,
	};
}
