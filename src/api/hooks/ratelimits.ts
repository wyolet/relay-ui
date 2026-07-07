import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitListResponse,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import { unwrap } from "@/api/unwrap";
import { isSystemOwned } from "@/lib/systemRateLimits";

// --- Query options ---

export const rateLimitsListQueryOptions = queryOptions({
	queryKey: ["ratelimits"] as const,
	queryFn: async (): Promise<RateLimitListResponse> => {
		const data = unwrap(await apiClient.GET("/rate-limits"));
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function rateLimitDetailQueryOptions(name: string) {
	return queryOptions({
		queryKey: ["ratelimits", name] as const,
		queryFn: async (): Promise<RateLimit> => {
			const data = unwrap(
				await apiClient.GET("/rate-limits/{ref}", {
					params: { path: { ref: name } },
				}),
			);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

/**
 * A rate-limit's rules surface in the server-side policy rate-limits join.
 */
function invalidateRateLimitDependents(
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	for (const key of [["ratelimits"], ["policies"]]) {
		void queryClient.invalidateQueries({ queryKey: key });
	}
}

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
			const data = unwrap(
				await apiClient.POST("/rate-limits", {
					body,
				}),
			);
			return data;
		},
		onSuccess: () => {
			invalidateRateLimitDependents(queryClient);
		},
	});
}

export function useUpdateRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: RateLimitUpdate;
		}): Promise<RateLimit> => {
			return unwrap(
				await apiClient.PUT("/rate-limits/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
		},
		onSuccess: () => {
			invalidateRateLimitDependents(queryClient);
		},
	});
}

export function useDeleteRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			unwrap(
				await apiClient.DELETE("/rate-limits/by-id/{id}", {
					params: { path: { id } },
				}),
			);
		},
		onSuccess: () => {
			invalidateRateLimitDependents(queryClient);
		},
	});
}
