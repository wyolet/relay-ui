import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type ProxyMode = components["schemas"]["ProxyMode"];
export type ProxyModeEnvelope = components["schemas"]["ProxyModeEnvelope"];
export type AuthOIDC = components["schemas"]["AuthOIDC"];
export type AuthOIDCEnvelope = components["schemas"]["AuthOIDCEnvelope"];
export type PayloadLogging = components["schemas"]["PayloadLogging"];
export type PayloadLoggingEnvelope =
	components["schemas"]["PayloadLoggingEnvelope"];

export const proxyModeQueryOptions = queryOptions({
	queryKey: ["settings", "proxy-mode"] as const,
	queryFn: async (): Promise<ProxyModeEnvelope> => {
		const data = unwrap(await apiClient.GET("/settings/proxy-mode"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function useProxyMode() {
	return useSuspenseQuery(proxyModeQueryOptions);
}

export function useUpdateProxyMode() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (value: ProxyMode): Promise<ProxyModeEnvelope> => {
			const data = unwrap(
				await apiClient.PUT("/settings/proxy-mode", {
					body: value,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export const payloadLoggingQueryOptions = queryOptions({
	queryKey: ["settings", "payload-logging"] as const,
	queryFn: async (): Promise<PayloadLoggingEnvelope> => {
		const data = unwrap(await apiClient.GET("/settings/payload-logging"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function usePayloadLogging() {
	return useSuspenseQuery(payloadLoggingQueryOptions);
}

export function useUpdatePayloadLogging() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			value: PayloadLogging,
		): Promise<PayloadLoggingEnvelope> => {
			const data = unwrap(
				await apiClient.PUT("/settings/payload-logging", {
					body: value,
				}),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export const authOIDCQueryOptions = queryOptions({
	queryKey: ["settings", "auth:oidc"] as const,
	queryFn: async (): Promise<AuthOIDCEnvelope> => {
		const data = unwrap(await apiClient.GET("/settings/auth:oidc"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function useAuthOIDC() {
	return useSuspenseQuery(authOIDCQueryOptions);
}

export function useUpdateAuthOIDC() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (value: AuthOIDC): Promise<AuthOIDCEnvelope> => {
			const data = unwrap(
				await apiClient.PUT("/settings/auth:oidc", { body: value }),
			);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}
