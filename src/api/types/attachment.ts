/**
 * Hand-written types for Attachment CRUD endpoints (PER-277).
 *
 * Backend assumptions:
 * - GET    /admin/attachments?parent_kind=pool&parent_name=<name> → { items: Attachment[] }
 * - POST   /admin/attachments  body: AttachmentCreate → Attachment (201)
 * - DELETE /admin/attachments/:id → 204
 */

export type AttachmentParentKind = "pool" | "secret" | "model";
export type AttachmentMeter = "requests" | "tokens" | "concurrency";

export interface Attachment {
	id: string;
	parent_kind: AttachmentParentKind;
	parent_name: string;
	ratelimit_name: string;
	meter: AttachmentMeter;
	created_at: string;
}

export interface AttachmentCreate {
	parent_kind: AttachmentParentKind;
	parent_name: string;
	ratelimit_name: string;
	meter: AttachmentMeter;
}

export interface AttachmentsListResponse {
	items: Attachment[];
}
