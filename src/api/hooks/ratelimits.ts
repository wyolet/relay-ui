import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { DetachedLinks } from "@/api/types/errors";
import type {
	RateLimit,
	RateLimitCreate,
	RateLimitListResponse,
	RateLimitUpdate,
} from "@/api/types/ratelimit";
import type { operations } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";
import { isSystemOwned } from "@/lib/systemRateLimits";

/** Server-side filter/sort/page params accepted by GET /rate-limits. */
export type RateLimitsListParams = NonNullable<
	operations["list_rate-limits"]["parameters"]["query"]
>;

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

export function rateLimitsListQuery(params: RateLimitsListParams) {
	return queryOptions({
		queryKey: ["ratelimits", "list", params] as const,
		queryFn: async (): Promise<RateLimitListResponse> =>
			unwrap(
				await apiClient.GET("/rate-limits", { params: { query: params } }),
			),
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

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

/** The rate limits a policy owned by `usableBy` may link; empty while loading. */
export function useUsableRateLimits(usableBy: string | undefined): RateLimit[] {
	const { data } = useQuery(rateLimitsListQuery({ usable_by: usableBy }));
	return data?.items ?? [];
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

/** Resolves to the links the delete took from rows that stay (empty on 204). */
export function useDeleteRateLimit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<DetachedLinks[]> => {
			const data = unwrap(
				await apiClient.DELETE("/rate-limits/by-id/{id}", {
					params: { path: { id } },
				}),
			);
			return data?.detached ?? [];
		},
		onSuccess: () => {
			invalidateRateLimitDependents(queryClient);
		},
	});
}
