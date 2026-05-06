import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "#/api/client";
import type { AttachmentListResponse } from "#/api/types/attachment";
import { ApiError } from "#/api/types/errors";

// --- Query options ---

/** Fetch all attachments across all parents (no filter). Read-only view. */
export const allAttachmentsQueryOptions = queryOptions({
	queryKey: ["attachments", "all"] as const,
	queryFn: async (): Promise<AttachmentListResponse> => {
		const { data, error } = await apiClient.GET("/admin/attachments");
		if (error) throw new ApiError(0, error.error);
		return data;
	},
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function attachmentsQueryOptions(params: {
	parent_kind: string;
	parent_name: string;
}) {
	return queryOptions({
		queryKey: ["attachments", params] as const,
		queryFn: async (): Promise<AttachmentListResponse> => {
			const { data, error } = await apiClient.GET("/admin/attachments", {
				params: {
					query: {
						parent_kind: params.parent_kind,
						parent_name: params.parent_name,
					},
				},
			});
			if (error) throw new ApiError(0, error.error);
			return data;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

// --- Hooks ---

/** Hook: all attachments across all parents. Read-only — derived from parent spec.rateLimits[]. */
export function useAllAttachments() {
	return useSuspenseQuery(allAttachmentsQueryOptions);
}

export function useAttachments(params: {
	parent_kind: string;
	parent_name: string;
}) {
	return useSuspenseQuery(attachmentsQueryOptions(params));
}
