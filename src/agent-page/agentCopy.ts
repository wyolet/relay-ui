import type { AddAgentValues } from "@/agents/useAddAgentForm";
import type { Account } from "@/api/hooks/accounts";
import type { Pool } from "@/api/hooks/pools";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { AGENT_ID_LABEL } from "@/lib/agentLabel";
import { displayLabel } from "@/lib/displayLabel";
import { accountBinding } from "@/policy-bindings/accountLookup";

export type AgentCopyValues = Pick<
	AddAgentValues,
	| "displayName"
	| "ownerKind"
	| "teamId"
	| "projectId"
	| "access"
	| "reach"
	| "accountIds"
	| "poolIds"
	| "models"
	| "policyId"
>;

export interface AgentCopySource {
	serviceAccount: ServiceAccount;
	/** The service account's own account. */
	account: Account | undefined;
	bindings: readonly PolicyBinding[];
	policies: readonly Policy[];
	pools: readonly Pool[];
	/** The account ids the Add agent form offers in the agent's project. */
	offeredAccountIds: readonly string[];
	/** The keyless-host pool ids the Add agent form offers in the agent's project. */
	offeredPoolIds: readonly string[];
}

/**
 * The Add agent form's start for a new agent set up like `serviceAccount`: a
 * policy made for it is read back into accounts, keyless-host pools and
 * models; any other bound policy is reused as is.
 */
export function agentCopyValues(source: AgentCopySource): AgentCopyValues {
	const { serviceAccount: sa } = source;
	const base: AgentCopyValues = {
		displayName: `${displayLabel(sa.metadata)} copy`,
		ownerKind: "project",
		teamId: "",
		projectId: sa.spec.projectId,
		access: "choose",
		reach: "all",
		accountIds: [],
		poolIds: [],
		models: [],
		policyId: "",
	};
	const accountId = source.account?.metadata.id;
	const binding = accountId
		? accountBinding(source.bindings, accountId)
		: undefined;
	if (!binding) return base;
	const policy = source.policies.find(
		(p) => p.metadata.id === binding.spec.policyId,
	);
	if (!policy || policy.metadata.labels?.[AGENT_ID_LABEL] !== sa.metadata.id) {
		return { ...base, access: "policy", policyId: binding.spec.policyId };
	}
	const poolIds = policy.spec.poolIds ?? [];
	const pooled = poolIds.flatMap(
		(id) =>
			source.pools.find((p) => p.metadata.id === id)?.spec.accountIds ?? [],
	);
	const offered = new Set(source.offeredAccountIds);
	const offeredPools = new Set(source.offeredPoolIds);
	return {
		...base,
		reach: poolIds.length > 0 ? "accounts" : "all",
		accountIds: [...new Set(pooled)].filter((id) => offered.has(id)),
		poolIds: poolIds.filter((id) => offeredPools.has(id)),
		models: [...(policy.spec.models ?? [])],
	};
}
