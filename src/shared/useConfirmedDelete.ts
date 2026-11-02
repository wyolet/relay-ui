import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import {
	ApiError,
	type DetachedLinks,
	isResourceInUse,
} from "@/api/types/errors";
import { deletedMessage } from "@/shared/deleteOutcome";
import { toast } from "@/shared/Toast";

export interface DeleteTarget {
	id: string;
	/** Slug the user types to confirm. */
	name: string;
	label: string;
}

type DeleteMutation = Pick<
	UseMutationResult<DetachedLinks[], Error, string>,
	"mutateAsync" | "isPending" | "error" | "reset"
>;

/**
 * Drives a typed-confirm delete: a resource_in_use refusal keeps the dialog
 * open with its blockers; a delete that unlinked rows names them in the toast.
 */
export function useConfirmedDelete(
	mutation: DeleteMutation,
	{ noun, onDeleted }: { noun: string; onDeleted?: () => void },
) {
	const [target, setTarget] = useState<DeleteTarget | null>(null);

	function request(next: DeleteTarget) {
		mutation.reset();
		setTarget(next);
	}

	function cancel() {
		mutation.reset();
		setTarget(null);
	}

	async function confirm() {
		if (!target) return;
		try {
			const detached = await mutation.mutateAsync(target.id);
			setTarget(null);
			toast("success", deletedMessage(noun, target.label, detached));
			onDeleted?.();
		} catch (err) {
			if (isResourceInUse(err)) return;
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: `Failed to delete ${noun}.`,
			);
		}
	}

	return {
		target,
		request,
		cancel,
		confirm,
		isPending: mutation.isPending,
		error: mutation.error,
	};
}
