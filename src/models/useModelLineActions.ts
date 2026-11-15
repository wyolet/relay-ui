import { useDeleteModel, useUpdateModel } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

/** What a model row may do to its model: switch it on or off, and whether
 * governance lets the caller edit or delete it. */
export function useModelLineActions(model: Model) {
	const update = useUpdateModel();
	const toastSaveError = useSaveErrorToast();
	const { canEdit, canDelete } = useMutability(model.metadata, "model");
	const enabled = model.spec.enabled !== false;

	async function setEnabled(next: boolean) {
		try {
			await update.mutateAsync({
				id: model.metadata.id ?? "",
				body: {
					metadata: model.metadata,
					spec: { ...model.spec, enabled: next },
				},
			});
			toast("success", next ? "Model enabled." : "Model disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to update model.");
		}
	}

	return { enabled, canEdit, canDelete, pending: update.isPending, setEnabled };
}

/** The typed-confirm delete a model list shares across its rows. */
export function useModelDelete() {
	return useConfirmedDelete(useDeleteModel(), { noun: "model" });
}
