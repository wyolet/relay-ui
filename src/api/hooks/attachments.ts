import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { adminGet } from "#/api/fetch";
import type {
	AttachmentParentKind,
	AttachmentsListResponse,
} from "#/api/types/attachment";

// --- Query options ---

/** Fetch all attachments across all parents (no filter). Read-only view. */
export const allAttachmentsQueryOptions = queryOptions({
	queryKey: ["attachments", "all"] as const,
	queryFn: () => adminGet<AttachmentsListResponse>("/admin/attachments"),
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});

export function attachmentsQueryOptions(params: {
	parent_kind: AttachmentParentKind;
	parent_name: string;
}) {
	return queryOptions({
		queryKey: ["attachments", params] as const,
		queryFn: () => {
			const qs = new URLSearchParams({
				parent_kind: params.parent_kind,
				parent_name: params.parent_name,
			}).toString();
			return adminGet<AttachmentsListResponse>(`/admin/attachments?${qs}`);
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
	parent_kind: AttachmentParentKind;
	parent_name: string;
}) {
	return useSuspenseQuery(attachmentsQueryOptions(params));
}
