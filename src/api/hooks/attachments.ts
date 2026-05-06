import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { adminDelete, adminGet, adminPost } from "#/api/fetch";
import type {
	Attachment,
	AttachmentCreate,
	AttachmentParentKind,
	AttachmentsListResponse,
} from "#/api/types/attachment";

// --- Query options ---

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

export function useAttachments(params: {
	parent_kind: AttachmentParentKind;
	parent_name: string;
}) {
	return useSuspenseQuery(attachmentsQueryOptions(params));
}

export function useCreateAttachment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: AttachmentCreate) =>
			adminPost<Attachment>("/admin/attachments", data),
		onSuccess: (_data, vars) => {
			void queryClient.invalidateQueries({
				queryKey: [
					"attachments",
					{ parent_kind: vars.parent_kind, parent_name: vars.parent_name },
				],
			});
		},
	});
}

export function useDeleteAttachment(params: {
	parent_kind: AttachmentParentKind;
	parent_name: string;
}) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			adminDelete(`/admin/attachments/${encodeURIComponent(id)}`),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["attachments", params],
			});
		},
	});
}
