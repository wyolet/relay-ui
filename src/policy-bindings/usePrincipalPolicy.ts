import { useQuery } from "@tanstack/react-query";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { usePolicyBindings } from "@/api/hooks/policyBindings";
import {
	type BindingPrincipal,
	principalBinding,
} from "@/policy-bindings/subjects";

/** The binding that governs a principal and the policy it attaches. */
export function usePrincipalPolicy(principal: BindingPrincipal) {
	const bindings = usePolicyBindings();
	const policies = useQuery(policiesListQueryOptions);
	const binding = principalBinding(bindings.data?.items ?? [], principal);
	const policy = binding
		? (policies.data?.items ?? []).find(
				(p) => p.metadata.id === binding.spec.policyId,
			)
		: undefined;
	return { status: bindings.status, binding, policy };
}
