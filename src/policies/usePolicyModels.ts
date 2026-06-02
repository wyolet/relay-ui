import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyModelExclusion,
	type PolicyModelView,
	policyModelsDebugQueryOptions,
	policyModelsQueryOptions,
} from "@/api/hooks/policies";

export type { PolicyModelView, PolicyModelExclusion };

/** Models this policy grants (resolved server-side), with effective limits. */
export function usePolicyModels(ref: string): PolicyModelView[] {
	const { data } = useSuspenseQuery(policyModelsQueryOptions(ref));
	return data.models ?? [];
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
