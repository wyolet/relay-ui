import { useMemo } from "react";
import { bindingsByHost, useBindings } from "@/api/hooks/bindings";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useModels } from "@/api/hooks/models";
import { usePolicies } from "@/api/hooks/policies";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";

export interface HostReferences {
	/** Models with at least one binding to this host. */
	models: Model[];
	/** Models whose binding to this host is enabled. */
	enabledModels: Model[];
	/** Host keys whose `spec.hostId` matches this host. */
	hostKeys: HostKey[];
	/** Policies owned by this host: its tier presets. */
	hostPolicies: Policy[];
	/** Policies that link any of this host's keys, directly or through a pool. */
	userPolicies: Array<{
		policy: Policy;
		hostKeyCount: number;
	}>;
}

/**
 * Everything that points at a host: models served, host keys configured,
 * the host's own policies, and the policies that link its keys. Pure
 * derivation from the cached lists — no extra fetch.
 */
export function useHostReferences(host: Host): HostReferences {
	const { data: modelsData } = useModels();
	const { data: hostKeysData } = useHostKeys();
	const { data: policiesData } = usePolicies();
	const { data: bindingsData } = useBindings();

	return useMemo(() => {
		const hostId = host.metadata.id ?? "";

		// Bindings to this host, indexed by the model they serve.
		const hostBindings =
			bindingsByHost(bindingsData.items ?? []).get(hostId) ?? [];
		const enabledModelIds = new Set(
			hostBindings
				.filter((b) => b.spec.enabled !== false)
				.map((b) => b.spec.modelId),
		);
		const boundModelIds = new Set(hostBindings.map((b) => b.spec.modelId));
		const models = (modelsData.items ?? []).filter((m) =>
			boundModelIds.has(m.metadata.id ?? ""),
		);
		const enabledModels = models.filter((m) =>
			enabledModelIds.has(m.metadata.id ?? ""),
		);

		const hostKeys = (hostKeysData.items ?? []).filter(
			(hk) => hk.spec.hostId === hostId,
		);

		const allPolicies = policiesData.items ?? [];
		const hostPolicies = allPolicies.filter(
			(p) =>
				p.metadata.owner?.kind === "host" && p.metadata.owner.id === hostId,
		);

		// `hostKey.policies` is server-derived and covers pool links too.
		const keyCountByPolicy = new Map<string, number>();
		for (const hk of hostKeys) {
			for (const ref of hk.policies ?? []) {
				keyCountByPolicy.set(ref.id, (keyCountByPolicy.get(ref.id) ?? 0) + 1);
			}
		}
		const userPolicies: HostReferences["userPolicies"] = allPolicies.flatMap(
			(p) => {
				const count = keyCountByPolicy.get(p.metadata.id ?? "") ?? 0;
				return count > 0 ? [{ policy: p, hostKeyCount: count }] : [];
			},
		);

		return {
			models,
			enabledModels,
			hostKeys,
			hostPolicies,
			userPolicies,
		};
	}, [host, modelsData, hostKeysData, policiesData, bindingsData]);
}
