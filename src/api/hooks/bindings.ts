import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components, operations } from "@/api/types.gen";

// --- Schema-derived types ---

/** A model↔host binding: which adapter serves a model on a host, and at what price. */
export type Binding = components["schemas"]["Binding"];
export type BindingSpec = components["schemas"]["Spec"];
type BindingList =
	operations["list_host-bindings"]["responses"]["200"]["content"]["application/json"];

// --- Query options ---

export const bindingsListQueryOptions = queryOptions({
	queryKey: ["host-bindings"] as const,
	queryFn: async (): Promise<BindingList> => {
		const { data, error } = await apiClient.GET("/host-bindings");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function useBindings() {
	return useSuspenseQuery(bindingsListQueryOptions);
}

// --- Pure selectors (shared by every consumer that joins bindings) ---

/** Group bindings by their `spec.modelId`. */
export function bindingsByModel(
	bindings: readonly Binding[],
): Map<string, Binding[]> {
	const out = new Map<string, Binding[]>();
	for (const b of bindings) {
		const list = out.get(b.spec.modelId);
		if (list) list.push(b);
		else out.set(b.spec.modelId, [b]);
	}
	return out;
}

/** Group bindings by their `spec.hostId`. */
export function bindingsByHost(
	bindings: readonly Binding[],
): Map<string, Binding[]> {
	const out = new Map<string, Binding[]>();
	for (const b of bindings) {
		const list = out.get(b.spec.hostId);
		if (list) list.push(b);
		else out.set(b.spec.hostId, [b]);
	}
	return out;
}
