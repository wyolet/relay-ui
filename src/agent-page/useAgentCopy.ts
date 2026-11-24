import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type AgentCopyValues, agentCopyValues } from "@/agent-page/agentCopy";
import {
	agentAccounts,
	keylessHostIds,
	keylessPools,
} from "@/agents/agentAccounts";
import { type AgentOwnerPick, copiedOwnerPick } from "@/agents/agentOwner";
import { agentOwnerLimits } from "@/agents/agentOwnerLimits";
import { useAuth, whoamiQueryOptions } from "@/api/auth";
import {
	accountListQuery,
	accountListQueryOptions,
	usableAccountsQuery,
} from "@/api/hooks/accounts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { poolListQuery, poolListQueryOptions } from "@/api/hooks/pools";
import { serviceAccountDetailQueryOptions } from "@/api/hooks/serviceAccounts";
import { pseudoKind } from "@/api/runtimeConfig";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { pickedScope, scopeUsableBy } from "@/lib/ownerPick";
import type { PersonalAccountEffective } from "@/lib/personalAccount";
import { required } from "@/lib/required";
import { serviceAccountScope } from "@/lib/serviceAccountScope";
import { ownAccount } from "@/policy-bindings/accountLookup";

const providerAccountsQuery = accountListQuery({ kind: ["provider"] });

/** The accounts the Add agent form offers the copy's owner: its pool picks. */
function ownerAccountsQuery(usableBy: string) {
	return usableAccountsQuery(usableBy, { kind: ["provider"] }, "pool");
}

/** The pools the copy's owner may link, as the Add agent form lists them. */
function ownerPoolsQuery(usableBy: string) {
	return poolListQuery({ usable_by: usableBy });
}

/**
 * The copy's owner pick, and the `usable_by` its offers are read for. A pick
 * with no scope yet (its card unavailable) reads the agent's own; the form
 * clears those picks once an owner is chosen.
 */
function copyOwner(
	sa: ServiceAccount,
	who: { userId?: string; personalAccountEffective?: PersonalAccountEffective },
): { pick: AgentOwnerPick; usableBy: string } {
	const own = serviceAccountScope(sa);
	const pick = copiedOwnerPick(
		own,
		agentOwnerLimits(who.personalAccountEffective),
	);
	const scope = pickedScope(pick, who.userId) ?? required(own, "agent's owner");
	return { pick, usableBy: scopeUsableBy(scope) };
}

/** Loads what {@link useAgentCopy} reads, so the form starts on it. */
export async function loadAgentCopy(
	queryClient: QueryClient,
	from: string,
): Promise<void> {
	const [sa, who] = await Promise.all([
		queryClient.ensureQueryData(serviceAccountDetailQueryOptions(from)),
		queryClient.ensureQueryData(whoamiQueryOptions),
	]);
	const { usableBy } = copyOwner(sa, who);
	await Promise.all([
		queryClient.ensureQueryData(accountListQueryOptions),
		queryClient.ensureQueryData(policyBindingsAllQueryOptions),
		queryClient.ensureQueryData(policiesListQueryOptions),
		queryClient.ensureQueryData(poolListQueryOptions),
		queryClient.ensureQueryData(hostsListQueryOptions),
		queryClient.ensureQueryData(providerAccountsQuery),
		queryClient.ensureQueryData(ownerAccountsQuery(usableBy)),
		queryClient.ensureQueryData(ownerPoolsQuery(usableBy)),
	]);
}

/** The Add agent form's start for an agent set up like service account `from`. */
export function useAgentCopy(from: string): AgentCopyValues {
	const { userId, personalAccountEffective } = useAuth();
	const { data: sa } = useSuspenseQuery(serviceAccountDetailQueryOptions(from));
	const { data: accounts } = useSuspenseQuery(accountListQueryOptions);
	const { data: bindings } = useSuspenseQuery(policyBindingsAllQueryOptions);
	const { data: policies } = useSuspenseQuery(policiesListQueryOptions);
	const { data: pools } = useSuspenseQuery(poolListQueryOptions);
	const { data: hosts } = useSuspenseQuery(hostsListQueryOptions);
	const { data: providers } = useSuspenseQuery(providerAccountsQuery);
	const owner = copyOwner(sa, { userId, personalAccountEffective });
	const { data: usable } = useSuspenseQuery(ownerAccountsQuery(owner.usableBy));
	const { data: usablePools } = useSuspenseQuery(
		ownerPoolsQuery(owner.usableBy),
	);
	const keyless = keylessHostIds(hosts.items ?? []);
	const offered = agentAccounts(
		usable.items ?? [],
		providers.items ?? [],
		userId,
		() => "",
		keyless,
	);
	// Only the one-request path lists pools; the chain path offers none.
	const offeredPools = pseudoKind("agents")
		? keylessPools(usablePools.items ?? [], keyless, () => "")
		: [];
	return agentCopyValues({
		serviceAccount: sa,
		owner: owner.pick,
		account: ownAccount(accounts.items ?? [], {
			kind: "serviceaccount",
			id: sa.metadata.id ?? "",
		}),
		bindings: bindings.items ?? [],
		policies: policies.items ?? [],
		pools: pools.items ?? [],
		offeredAccountIds: offered.map((a) => a.id),
		offeredPoolIds: offeredPools.map((p) => p.id),
	});
}
