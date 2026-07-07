import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type Governance = components["schemas"]["Governance"];
export type GovernanceEnvelope = components["schemas"]["GovernanceEnvelope"];

/** Catalog-managed resource types that carry their own mutation guardrail. */
export type GovernanceSection = "host" | "model" | "policy" | "provider";

async function fetchGovernance(
	section: GovernanceSection,
): Promise<GovernanceEnvelope> {
	const res =
		section === "host"
			? await apiClient.GET("/settings/governance:host")
			: section === "model"
				? await apiClient.GET("/settings/governance:model")
				: section === "policy"
					? await apiClient.GET("/settings/governance:policy")
					: await apiClient.GET("/settings/governance:provider");
	return unwrap(res);
}

async function putGovernance(
	section: GovernanceSection,
	body: Governance,
): Promise<GovernanceEnvelope> {
	const res =
		section === "host"
			? await apiClient.PUT("/settings/governance:host", { body })
			: section === "model"
				? await apiClient.PUT("/settings/governance:model", { body })
				: section === "policy"
					? await apiClient.PUT("/settings/governance:policy", { body })
					: await apiClient.PUT("/settings/governance:provider", { body });
	return unwrap(res);
}

export function governanceQueryOptions(section: GovernanceSection) {
	return queryOptions({
		queryKey: ["settings", "governance", section] as const,
		queryFn: () => fetchGovernance(section),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Current edit/delete guardrail flags for a catalog-managed resource type. */
export function useGovernance(section: GovernanceSection): Governance {
	return useSuspenseQuery(governanceQueryOptions(section)).data.value;
}

export function useUpdateGovernance(section: GovernanceSection) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (value: Governance): Promise<GovernanceEnvelope> =>
			putGovernance(section, value),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["settings", "governance", section],
			});
		},
	});
}
