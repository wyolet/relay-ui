import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost, adminPut } from "#/api/fetch";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitsListResponse,
	RateLimitUpdate,
} from "#/api/types/ratelimit";

// --- Query options ---

export const rateLimitsListQueryOptions = queryOptions({
	queryKey: ["ratelimits"] as const,
	queryFn: () => adminGet<RateLimitsListResponse>("/admin/ratelimits"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function rateLimitDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["ratelimits", name] as const,
		queryFn: () =>
			adminGet<RateLimit>(`/admin/ratelimits/${encodeURIComponent(name)}`),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useRateLimits() {
	return useSuspenseQuery(rateLimitsListQueryOptions);
}

export function useRateLimit(name: string) {
	return useSuspenseQuery(rateLimitDetailQueryOptions(name));
}

export function useCreateRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: RateLimitCreate) =>
			adminPost<RateLimit>("/admin/ratelimits", data),
		onMutate: async (newRL) => {
			await queryClient.cancelQueries({ queryKey: ["ratelimits"] });
			const previous = queryClient.getQueryData(
				rateLimitsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				rateLimitsListQueryOptions.queryKey,
				(old: RateLimitsListResponse | undefined) => {
					if (!old) return old;
					const optimistic: RateLimit = {
						metadata: { name: newRL.metadata.name },
						spec: { ...newRL.spec },
					};
					return { items: [...old.items, optimistic] };
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					rateLimitsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["ratelimits"] });
		},
	});
}

export function useUpdateRateLimit(name: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: RateLimitUpdate) =>
			adminPut<RateLimit>(
				`/admin/ratelimits/${encodeURIComponent(name)}`,
				data,
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["ratelimits"] });
		},
	});
}

export function useDeleteRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			adminDelete(`/admin/ratelimits/${encodeURIComponent(name)}`),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: ["ratelimits"] });
			const previous = queryClient.getQueryData(
				rateLimitsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				rateLimitsListQueryOptions.queryKey,
				(old: RateLimitsListResponse | undefined) => {
					if (!old) return old;
					return {
						items: old.items.filter((rl) => rl.metadata.name !== name),
					};
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					rateLimitsListQueryOptions.queryKey,
					context.previous,
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["ratelimits"] });
		},
	});
}
