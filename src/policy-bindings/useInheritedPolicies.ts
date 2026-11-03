import { useQuery } from "@tanstack/react-query";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { hasLimitsView } from "@/accounts/limitsView";
import {
	accountListQueryOptions,
	useAccountLimits,
} from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { displayLabel } from "@/lib/displayLabel";
import { type Ladder, toLadder } from "@/policy-bindings/ladder";
import {
	type AccountRef,
	useAccountPolicy,
} from "@/policy-bindings/useAccountPolicy";

/** The policies above the account, from its limits read; undefined while loading or when the read fails. */
export function useInheritedPolicies(ref: AccountRef): Ladder | undefined {
	const { account, binding } = useAccountPolicy(ref);
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });
	const policies = useQuery(policiesListQueryOptions);
	const { data } = useAccountLimits(
		account?.metadata.name ?? "",
		account !== undefined && hasLimitsView(account.spec.kind),
	);
	if (!data) return undefined;

	const accountItems = accounts.data?.items ?? [];
	const policyItems = policies.data?.items ?? [];
	return toLadder(
		data,
		{
			scope: (a) => {
				const row = accountItems.find((x) => x.metadata.id === a.id);
				return `${ACCOUNT_KIND_LABELS[a.kind]} ${row ? displayLabel(row.metadata) : a.name}`;
			},
			policy: (p) => {
				const row = policyItems.find((x) => x.metadata.id === p.id);
				return row ? displayLabel(row.metadata) : p.name;
			},
		},
		binding !== undefined,
	);
}
