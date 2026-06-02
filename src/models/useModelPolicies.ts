import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ModelPolicyView,
	modelPoliciesQueryOptions,
} from "@/api/hooks/models";

export type { ModelPolicyView };

/** Policies that grant this model, with the limits each applies to it. */
export function useModelPolicies(ref: string): ModelPolicyView[] {
	const { data } = useSuspenseQuery(modelPoliciesQueryOptions(ref));
	return data.policies ?? [];
}
