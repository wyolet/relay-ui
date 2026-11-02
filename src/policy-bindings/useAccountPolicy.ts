import { useQuery } from "@tanstack/react-query";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { usePolicyBindings } from "@/api/hooks/policyBindings";
import {
	type AccountOwnerRef,
	accountBinding,
	ownAccount,
} from "@/policy-bindings/accountLookup";

/** An account by id (a key's lane), or the own account of a team, project or service account. */
export type AccountRef = { accountId: string } | { ownerOf: AccountOwnerRef };

/** The account a ref names, the binding that holds it, and that binding's policy. */
export function useAccountPolicy(ref: AccountRef) {
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });
	const bindings = usePolicyBindings();
	const policies = useQuery(policiesListQueryOptions);

	const items = accounts.data?.items ?? [];
	const account =
		"accountId" in ref
			? items.find((a) => a.metadata.id === ref.accountId)
			: ownAccount(items, ref.ownerOf);
	const accountId = account?.metadata.id;
	const binding = accountId
		? accountBinding(bindings.data?.items ?? [], accountId)
		: undefined;
	const policy = binding
		? (policies.data?.items ?? []).find(
				(p) => p.metadata.id === binding.spec.policyId,
			)
		: undefined;

	const status: "pending" | "error" | "success" =
		accounts.status === "error" || bindings.status === "error"
			? "error"
			: accounts.status === "pending" || bindings.status === "pending"
				? "pending"
				: "success";
	return { status, account, binding, policy };
}
