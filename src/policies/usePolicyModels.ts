import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyModelView,
	policyModelsQueryOptions,
} from "@/api/hooks/policies";

export type { PolicyModelView };

/** Models this policy grants (resolved server-side), with effective limits. */
export function usePolicyModels(ref: string): PolicyModelView[] {
	const { data } = useSuspenseQuery(policyModelsQueryOptions(ref));
	return data.models ?? [];
}
