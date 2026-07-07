import { useQuery } from "@tanstack/react-query";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { providersListQueryOptions } from "@/api/hooks/providers";

/**
 * Empty-catalog flag that gates the dashboard welcome panel
 * (no providers and no host keys = fresh install).
 */
export function useCatalogEmpty(): boolean {
	const { data: providers } = useQuery(providersListQueryOptions);
	const { data: hostKeys } = useQuery(hostKeysListQueryOptions);

	// Only "empty" once the gating queries have actually loaded and report zero.
	// While they're undefined (loading or relay unreachable), treat as not-empty
	// so the dashboard doesn't flicker to the welcome panel on every failed poll.
	return (
		providers !== undefined &&
		hostKeys !== undefined &&
		(providers.items ?? []).length === 0 &&
		(hostKeys.items ?? []).length === 0
	);
}
