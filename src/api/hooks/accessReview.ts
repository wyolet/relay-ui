import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
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
