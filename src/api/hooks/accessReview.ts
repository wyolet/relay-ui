import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";
import type { AccessReview } from "@/lib/accessReview";

export type AccessReviewRequest =
	components["schemas"]["accessReviewInputBody"];
export type AccessReviewSubject = components["schemas"]["reviewSubjectInput"];
export type AccessReviewOwnerKind =
	components["schemas"]["reviewOwnerInput"]["kind"];

async function postAccessReview(
	body: AccessReviewRequest,
): Promise<AccessReview> {
	return unwrap(await apiClient.POST("/access-review", { body }));
}

/** A check is a read, but checking someone else writes an audit row, so it
 * runs on demand rather than as a cached query. */
export function useAccessReview() {
	return useMutation({ mutationFn: postAccessReview });
}

/**
 * Whether the relay answers access reviews at all: `RELAY_AUTHZ=single` answers
 * 501, and a relay predating the endpoint 404s. Probed with a self-check on a
 * collection, which never 404s for visibility and is not audited.
 */
export const accessReviewAvailableQueryOptions = queryOptions({
	queryKey: ["access-review", "available"] as const,
	queryFn: async (): Promise<boolean> => {
		try {
			await postAccessReview({
				action: "roles.list",
				resource: { kind: "roles" },
			});
			return true;
		} catch (err) {
			if (
				err instanceof ApiError &&
				(err.status === 501 || err.status === 404)
			) {
				return false;
			}
			throw err;
		}
	},
	// The authz mode is fixed for the process lifetime.
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: Number.POSITIVE_INFINITY,
	retry: false,
});

/** False until the probe answers, so entry points appear rather than vanish. */
export function useAccessReviewAvailable(): boolean {
	const { authenticated } = useAuth();
	const { data } = useQuery({
		...accessReviewAvailableQueryOptions,
		enabled: authenticated,
	});
	return data === true;
}
