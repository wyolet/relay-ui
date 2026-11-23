import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { providersListQueryOptions, useProviders } from "@/api/hooks/providers";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";

export interface ModelProvider {
	provider: Provider | undefined;
	providerSlug: string;
}

export function findModelProvider(
	model: Model,
	providers: readonly Provider[],
): Provider | undefined {
	const owner = model.metadata.owner;
	if (owner?.kind !== "provider" || !owner.id) return undefined;
	return providers.find((p) => p.metadata.id === owner.id);
}

/** Resolve a model's owning provider (for the "by …" link). */
export function useModelProvider(model: Model): ModelProvider {
	const { data: providersData } = useProviders();
	return useMemo(() => {
		const provider = findModelProvider(model, providersData.items ?? []);
		return { provider, providerSlug: provider?.metadata.name ?? "" };
	}, [model, providersData]);
}

/** The model's icon, or its provider's once the providers have loaded. */
export function useModelIconPath(model: Model): string | undefined {
	const { data: providersData } = useQuery(providersListQueryOptions);
	return (
		model.spec.icon?.path ||
		findModelProvider(model, providersData?.items ?? [])?.spec.icon?.path
	);
}
