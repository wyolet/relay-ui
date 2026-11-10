import { useQuery } from "@tanstack/react-query";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import {
	usePolicyBindings,
	usePolicyBindingsOf,
} from "@/api/hooks/policyBindings";
import { displayLabel } from "@/lib/displayLabel";
import type { LinkChoice } from "@/policies/usePolicyLinkChoices";
import { boundAccountIds } from "@/policy-bindings/policyTargets";

/** The accounts the policy's bindings hold, as link rows; undefined while loading. */
export function usePolicyAppliesTo(
	policyId: string | undefined,
): LinkChoice[] | undefined {
	const bindings = usePolicyBindingsOf(policyId);
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });
	if (!policyId || !bindings.data) return undefined;
	const byId = new Map(
		(accounts.data?.items ?? []).map((a) => [a.metadata.id, a]),
	);
	return boundAccountIds(bindings.data.items ?? [], policyId).map((id) => {
		const account = byId.get(id);
		return account
			? {
					id,
					name: account.metadata.name,
					label: displayLabel(account.metadata),
					meta: `${ACCOUNT_KIND_LABELS[account.spec.kind]} account`,
				}
			: { id, name: id, label: `${id.slice(0, 8)}…`, meta: "Account" };
	});
}

/** How many accounts each policy applies to, by policy id; undefined while loading. */
export function usePolicyAppliesToCounts(): Map<string, number> | undefined {
	const bindings = usePolicyBindings();
	if (!bindings.data) return undefined;
	const counts = new Map<string, number>();
	for (const b of bindings.data.items ?? []) {
		const id = b.spec.policyId;
		counts.set(id, (counts.get(id) ?? 0) + (b.spec.accountIds ?? []).length);
	}
	return counts;
}
