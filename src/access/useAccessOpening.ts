import { useQuery } from "@tanstack/react-query";
import {
	type AccessPrefill,
	accessPrefill,
	type CurrentAccessPrefill,
	currentAccessPrefill,
} from "@/access/accessOptions";
import type { AccessTarget } from "@/access/accessTarget";
import {
	ACCESS_KIND,
	bindingOffLine,
	prefillRefusal,
} from "@/access/pseudoAccessBody";
import {
	type AgentAccount,
	type AgentPool,
	agentAccounts,
	keylessHostIds,
	keylessPools,
} from "@/agents/agentAccounts";
import { useAuth } from "@/api/auth";
import { useAccountsList } from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import {
	type Pool,
	poolListQueryOptions,
	useUsablePools,
} from "@/api/hooks/pools";
import {
	type AccessCase,
	type PseudoAccessAnswer,
	usePseudoAccessCurrent,
} from "@/api/hooks/pseudoAccess";
import { pseudoKind } from "@/api/runtimeConfig";
import { displayLabel } from "@/lib/displayLabel";
import { scopeUsableBy } from "@/lib/ownerPick";
import { serviceAccountScopeOwner } from "@/lib/serviceAccountScope";
import { type OwnPolicyCase, ownPolicyCase } from "@/policy-bindings/ownPolicy";
import { pseudoTarget } from "@/pseudo/target";

/** What the form may offer the target. */
export interface AccessOffers {
	accounts: AgentAccount[];
	/** Pools at keyless hosts; listed on the one-request path only. */
	pools: AgentPool[];
}

/** What the target has as the form opens; a save never re-reads it. */
export type OpenedAccess =
	| {
			path: "chain";
			policyCase: Exclude<OwnPolicyCase, { kind: "above" }>;
			prefill: AccessPrefill;
	  }
	| {
			path: "oneRequest";
			accessCase: AccessCase;
			/** The target's policy by its display name. */
			policyName?: string;
			/** Beside the policy line when the binding holding the target is off. */
			bindingOffLine?: string;
			prefill: CurrentAccessPrefill;
	  };

function useAccessOffers(target: AccessTarget, oneRequest: boolean) {
	const { userId } = useAuth();
	const usableBy = scopeUsableBy(target.scope);
	const { data: hosts } = useHosts();
	const { data: visible } = useAccountsList({ kind: ["provider"] });
	const { data: usable } = useAccountsList({
		kind: ["provider"],
		usable_by: usableBy,
		usable_for: "pool",
	});
	const usablePools = useUsablePools(usableBy, {}, { enabled: oneRequest });

	const hostItems = hosts.items ?? [];
	const hostLabel = (hostId: string) => {
		const host = hostItems.find((h) => h.metadata.id === hostId);
		return host ? displayLabel(host.metadata) : hostId;
	};
	const keyless = keylessHostIds(hostItems);
	return {
		offers: {
			accounts: agentAccounts(
				usable.items ?? [],
				visible.items ?? [],
				userId,
				hostLabel,
				keyless,
			),
			pools: oneRequest
				? keylessPools(usablePools.items, keyless, hostLabel)
				: [],
		},
		poolsLoaded: !oneRequest || usablePools.loaded,
		hostLabel,
		keyless,
	};
}

/** What the target is under now, before anything the form offers is read. */
export type AccessCaseState =
	| { status: "loading" }
	/** `message` is relay's, naming the scope that holds the policy. */
	| { status: "above"; message?: string }
	| { status: "failed"; message: string }
	| { status: "known"; known: KnownCase };

export type KnownCase =
	| {
			path: "chain";
			policyCase: Exclude<OwnPolicyCase, { kind: "above" }>;
			pools: readonly Pool[];
	  }
	| { path: "oneRequest"; answer: PseudoAccessAnswer };

/**
 * The target's case: relay's dry run answers it with the current access on
 * the one-request path; the chain reads the bindings, policies and pools
 * itself. Read before the offers, so a policy set above the caller shows
 * even when the caller may not read what the form would offer.
 */
export function useAccessCase(target: AccessTarget): AccessCaseState {
	const oneRequest = pseudoKind(ACCESS_KIND);
	const chain = { enabled: !oneRequest, throwOnError: true };
	const policies = useQuery({ ...policiesListQueryOptions, ...chain });
	const bindings = useQuery({ ...policyBindingsAllQueryOptions, ...chain });
	const pools = useQuery({ ...poolListQueryOptions, ...chain });
	const current = usePseudoAccessCurrent(pseudoTarget(target), {
		enabled: oneRequest,
	});

	if (oneRequest) {
		if (current.error) {
			const { above, message } = prefillRefusal(current.error);
			return above
				? { status: "above", message }
				: { status: "failed", message };
		}
		return current.data
			? { status: "known", known: { path: "oneRequest", answer: current.data } }
			: { status: "loading" };
	}
	if (!policies.data || !bindings.data || !pools.data) {
		return { status: "loading" };
	}
	const policyCase = ownPolicyCase(
		target.accountId,
		bindings.data.items ?? [],
		policies.data.items ?? [],
		serviceAccountScopeOwner(target.scope),
	);
	if (policyCase.kind === "above") return { status: "above" };
	return {
		status: "known",
		known: { path: "chain", policyCase, pools: pools.data.items ?? [] },
	};
}

/** The form's offers and the fields filled from the known case; no `opened` while the offered pools load. */
export function useAccessOpening(
	target: AccessTarget,
	known: KnownCase,
): { opened?: OpenedAccess; offers: AccessOffers } {
	const oneRequest = known.path === "oneRequest";
	const { offers, poolsLoaded, hostLabel, keyless } = useAccessOffers(
		target,
		oneRequest,
	);
	if (!poolsLoaded) return { offers };
	if (known.path === "oneRequest") {
		const { answer } = known;
		return {
			opened: {
				path: "oneRequest",
				accessCase: answer.case,
				policyName: answer.current
					? displayLabel(answer.current.policy)
					: undefined,
				bindingOffLine: bindingOffLine(answer.current),
				prefill: currentAccessPrefill(
					answer.current,
					offers.accounts,
					offers.pools,
					hostLabel,
					keyless,
				),
			},
			offers,
		};
	}
	const { policyCase } = known;
	return {
		opened: {
			path: "chain",
			policyCase,
			prefill: accessPrefill(
				policyCase.kind === "create" ? undefined : policyCase.policy,
				known.pools,
				offers.accounts,
				hostLabel,
				keyless,
			),
		},
		offers,
	};
}
