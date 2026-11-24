import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type AgentCopyValues, agentCopyValues } from "@/agent-page/agentCopy";
import {
	agentAccounts,
	keylessHostIds,
	keylessPools,
} from "@/agents/agentAccounts";
import { useAuth } from "@/api/auth";
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
import { scopeUsableBy } from "@/lib/ownerPick";
import { ownAccount } from "@/policy-bindings/accountLookup";

const providerAccountsQuery = accountListQuery({ kind: ["provider"] });

/** The accounts the Add agent form offers for a project agent: its owner's pool picks. */
function projectAccountsQuery(projectId: string) {
	return usableAccountsQuery(
		scopeUsableBy({ kind: "project", id: projectId }),
		{ kind: ["provider"] },
		"pool",
	);
}

/** The pools a project agent may link, as the Add agent form lists them. */
function projectPoolsQuery(projectId: string) {
	return poolListQuery({
		usable_by: scopeUsableBy({ kind: "project", id: projectId }),
	});
}

/** Loads what {@link useAgentCopy} reads, so the form starts on it. */
export async function loadAgentCopy(
	queryClient: QueryClient,
	from: string,
): Promise<void> {
	const sa = await queryClient.ensureQueryData(
		serviceAccountDetailQueryOptions(from),
	);
	await Promise.all([
		queryClient.ensureQueryData(accountListQueryOptions),
		queryClient.ensureQueryData(policyBindingsAllQueryOptions),
		queryClient.ensureQueryData(policiesListQueryOptions),
		queryClient.ensureQueryData(poolListQueryOptions),
		queryClient.ensureQueryData(hostsListQueryOptions),
		queryClient.ensureQueryData(providerAccountsQuery),
		queryClient.ensureQueryData(projectAccountsQuery(sa.spec.projectId)),
		queryClient.ensureQueryData(projectPoolsQuery(sa.spec.projectId)),
	]);
}

/** The Add agent form's start for an agent set up like service account `from`. */
export function useAgentCopy(from: string): AgentCopyValues {
	const { userId } = useAuth();
	const { data: sa } = useSuspenseQuery(serviceAccountDetailQueryOptions(from));
	const { data: accounts } = useSuspenseQuery(accountListQueryOptions);
	const { data: bindings } = useSuspenseQuery(policyBindingsAllQueryOptions);
	const { data: policies } = useSuspenseQuery(policiesListQueryOptions);
	const { data: pools } = useSuspenseQuery(poolListQueryOptions);
	const { data: hosts } = useSuspenseQuery(hostsListQueryOptions);
	const { data: providers } = useSuspenseQuery(providerAccountsQuery);
	const { data: usable } = useSuspenseQuery(
		projectAccountsQuery(sa.spec.projectId),
	);
	const { data: usablePools } = useSuspenseQuery(
		projectPoolsQuery(sa.spec.projectId),
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
