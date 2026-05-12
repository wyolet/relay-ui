import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitListResponse,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import { isSystemOwned } from "@/lib/systemRateLimits";

// --- Query options ---

export const rateLimitsListQueryOptions = queryOptions({
	queryKey: ["ratelimits"] as const,
	queryFn: async (): Promise<RateLimitListResponse> => {
		const { data, error } = await apiClient.GET("/control/ratelimits");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function rateLimitDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["ratelimits", name] as const,
		queryFn: async (): Promise<RateLimit> => {
			const { data, error } = await apiClient.GET("/control/ratelimits/{ref}", {
				params: { path: { ref: name } },
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

export function useRateLimits() {
	return useSuspenseQuery(rateLimitsListQueryOptions);
}

/** System-owned RLs only — for /settings/rate-limits. */
export function useSystemRateLimits(): RateLimit[] {
	const { data } = useSuspenseQuery(rateLimitsListQueryOptions);
	return (data.items ?? []).filter(isSystemOwned);
}

/** Strictly user-owned RLs — for the user-managed list table and create flows. */
export function useUserRateLimits(): RateLimit[] {
	const { data } = useSuspenseQuery(rateLimitsListQueryOptions);
	return (data.items ?? []).filter(
		(rl) => !isSystemOwned(rl) && rl.metadata.owner?.kind !== "provider",
	);
}

/** Everything attachable to a Policy/Key/Model — user + provider, excludes system. */
export function useAttachableRateLimits(): RateLimit[] {
	const { data } = useSuspenseQuery(rateLimitsListQueryOptions);
	return (data.items ?? []).filter((rl) => !isSystemOwned(rl));
}

export function useRateLimit(name: string) {
	return useSuspenseQuery(rateLimitDetailQueryOptions(name));
}

export function useCreateRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: RateLimitCreate): Promise<RateLimit> => {
			const { data, error } = await apiClient.POST("/control/ratelimits", {
				body,
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onMutate: async (newRL) => {
			await queryClient.cancelQueries({ queryKey: ["ratelimits"] });
			const previous = queryClient.getQueryData(
				rateLimitsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				rateLimitsListQueryOptions.queryKey,
				(old: RateLimitListResponse | undefined) => {
					if (!old) return old;
					const optimistic: RateLimit = {
						metadata: { name: newRL.metadata.name },
						spec: { ...newRL.spec },
					};
					return { items: [...(old.items ?? []), optimistic] };
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

export function useUpdateRateLimit(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: RateLimitUpdate): Promise<RateLimit> => {
			const { data, error } = await apiClient.PUT(
				"/control/ratelimits/by-id/{id}",
				{
					params: { path: { id } },
					body,
				},
			);
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["ratelimits"] });
		},
	});
}

export function useDeleteRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await apiClient.DELETE(
				"/control/ratelimits/by-id/{id}",
				{
					params: { path: { id } },
				},
			);
			if (error) throw new ApiError(0, error.error);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["ratelimits"] });
			const previous = queryClient.getQueryData(
				rateLimitsListQueryOptions.queryKey,
			);
			queryClient.setQueryData(
				rateLimitsListQueryOptions.queryKey,
				(old: RateLimitListResponse | undefined) => {
					if (!old) return old;
					return {
						items: (old.items ?? []).filter((rl) => rl.metadata.id !== id),
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
