import { useMemo } from "react";
import { useProviders } from "@/api/hooks/providers";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";

export interface ModelProvider {
	provider: Provider | undefined;
	providerSlug: string;
}

/** Resolve a model's owning provider (for the header logo + "by …" link). */
export function useModelProvider(model: Model): ModelProvider {
	const { data: providersData } = useProviders();
	return useMemo(() => {
		const ownerId =
			model.metadata.owner?.kind === "provider"
				? (model.metadata.owner.id ?? "")
				: "";
		const provider = (providersData.items ?? []).find(
			(p) => p.metadata.id === ownerId,
		);
		return { provider, providerSlug: provider?.metadata.name ?? "" };
	}, [model.metadata.owner, providersData]);
}
