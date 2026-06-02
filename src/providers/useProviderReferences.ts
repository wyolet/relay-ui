import { useMemo } from "react";
import { bindingsByModel, useBindings } from "@/api/hooks/bindings";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";

export interface ProviderReferences {
	models: Model[];
	/** Hosts that serve at least one model from this provider. */
	hosts: Host[];
	/** Map hostId → number of provider's models served on that host. */
	modelCountByHost: Map<string, number>;
}

export function useProviderReferences(provider: Provider): ProviderReferences {
	const { data: modelsData } = useModels();
	const { data: hostsData } = useHosts();
	const { data: bindingsData } = useBindings();

	return useMemo(() => {
		const providerId = provider.metadata.id ?? "";

		const models = (modelsData.items ?? []).filter(
			(m) =>
				m.metadata.owner?.kind === "provider" &&
				m.metadata.owner.id === providerId,
		);

		const hostById = new Map<string, Host>();
		for (const h of hostsData.items ?? []) {
			if (h.metadata.id) hostById.set(h.metadata.id, h);
		}

		const byModel = bindingsByModel(bindingsData.items ?? []);
		const modelCountByHost = new Map<string, number>();
		const hostIdsUsed = new Set<string>();
		for (const m of models) {
			for (const b of byModel.get(m.metadata.id ?? "") ?? []) {
				hostIdsUsed.add(b.spec.hostId);
				modelCountByHost.set(
					b.spec.hostId,
					(modelCountByHost.get(b.spec.hostId) ?? 0) + 1,
				);
			}
		}
		const hosts: Host[] = [];
		for (const id of hostIdsUsed) {
			const h = hostById.get(id);
			if (h) hosts.push(h);
		}

		return { models, hosts, modelCountByHost };
	}, [provider, modelsData, hostsData, bindingsData]);
}
