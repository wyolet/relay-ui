import { useQuery } from "@tanstack/react-query";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";

export interface CatalogCount {
	label: string;
	count: number | undefined;
}

/**
 * Resource counts for the dashboard catalog cards, plus the empty-catalog flag
 * that gates the welcome panel (no providers and no host keys = fresh install).
 */
export function useCatalogCounts() {
	const { data: providers } = useQuery(providersListQueryOptions);
	const { data: policies } = useQuery(policiesListQueryOptions);
	const { data: hostKeys } = useQuery(hostKeysListQueryOptions);
	const { data: models } = useQuery(modelsListQueryOptions);
	const { data: hosts } = useQuery(hostsListQueryOptions);
	const { data: rateLimits } = useQuery(rateLimitsListQueryOptions);

	const counts: CatalogCount[] = [
		{ label: "Providers", count: providers?.items?.length },
		{ label: "Policies", count: policies?.items?.length },
		{ label: "Host Keys", count: hostKeys?.items?.length },
		{ label: "Models", count: models?.items?.length },
		{ label: "Hosts", count: hosts?.items?.length },
		{ label: "Rate Limits", count: rateLimits?.items?.length },
	];

	const catalogEmpty =
		(providers?.items ?? []).length === 0 &&
		(hostKeys?.items ?? []).length === 0;

	return { counts, catalogEmpty };
}
