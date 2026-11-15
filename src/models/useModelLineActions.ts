import { useUpdateModel } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { toast } from "@/shared/Toast";

/** A model row's switch: its model's on/off state, and whether governance
 * lets the caller change it. */
export function useModelLineActions(model: Model) {
	const update = useUpdateModel();
	const toastSaveError = useSaveErrorToast();
	const { canEdit } = useMutability(model.metadata, "model");
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

	return { enabled, canEdit, pending: update.isPending, setEnabled };
}
