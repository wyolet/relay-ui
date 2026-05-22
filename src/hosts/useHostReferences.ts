import { useMemo } from "react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useModels } from "@/api/hooks/models";
import { usePolicies } from "@/api/hooks/policies";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";

export interface HostReferences {
	/** Models with at least one binding to this host. */
	models: Model[];
	/** Host keys whose `spec.hostId` matches this host. */
	hostKeys: HostKey[];
	/** Policies owned by this host (host policies / tiers). */
	hostPolicies: Policy[];
	/** User policies that include any host key from this host in their pool. */
	userPolicies: Array<{
		policy: Policy;
		hostKeyCount: number;
		relayKeyCount: number;
	}>;
	/** Sum of non-revoked relay keys whose policy uses any HK of this host. */
	totalRelayKeys: number;
}

/**
 * Everything that points at a host: models served, host keys configured,
 * the host's own policies, and the user policies that reach them via host
 * keys. Pure derivation from the four lists — no extra fetch.
 */
export function useHostReferences(host: Host): HostReferences {
	const { data: modelsData } = useModels();
	const { data: hostKeysData } = useHostKeys();
	const { data: policiesData } = usePolicies();
	const { data: relayKeysData } = useRelayKeys();

	return useMemo(() => {
		const hostId = host.metadata.id ?? "";

		const models = (modelsData.items ?? []).filter((m) =>
			(m.spec.hosts ?? []).some((b) => b.hostId === hostId),
		);

		const hostKeys = (hostKeysData.items ?? []).filter(
			(hk) => hk.spec.hostId === hostId,
		);
		const hostKeyIds = new Set(
			hostKeys.map((hk) => hk.metadata.id).filter((x): x is string => !!x),
		);

		const allPolicies = policiesData.items ?? [];
		const hostPolicies = allPolicies.filter(
			(p) =>
				p.metadata.owner?.kind === "host" && p.metadata.owner.id === hostId,
		);

		const relayKeyCountByPolicy = new Map<string, number>();
		for (const rk of relayKeysData.items ?? []) {
			const pid = rk.spec.policyId;
			if (!pid) continue;
			relayKeyCountByPolicy.set(pid, (relayKeyCountByPolicy.get(pid) ?? 0) + 1);
		}

		const userPolicies: HostReferences["userPolicies"] = [];
		let totalRelayKeys = 0;
		for (const p of allPolicies) {
			if (p.metadata.owner?.kind === "host") continue;
			const hits = (p.spec.hostKeyIds ?? []).filter((id) => hostKeyIds.has(id));
			if (hits.length === 0) continue;
			const rkCount = p.metadata.id
				? (relayKeyCountByPolicy.get(p.metadata.id) ?? 0)
				: 0;
			userPolicies.push({
				policy: p,
				hostKeyCount: hits.length,
				relayKeyCount: rkCount,
			});
			totalRelayKeys += rkCount;
		}

		return {
			models,
			hostKeys,
			hostPolicies,
			userPolicies,
			totalRelayKeys,
		};
	}, [host, modelsData, hostKeysData, policiesData, relayKeysData]);
}
