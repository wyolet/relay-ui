import { useSetModelEnabled } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { toast } from "@/shared/Toast";

/** A model row's switch: its model's on/off state, and whether governance
 * lets the caller change it. */
export function useModelLineActions(model: Model) {
	const toggle = useSetModelEnabled();
	const toastSaveError = useSaveErrorToast();
	const { canEdit } = useMutability(model.metadata, "model");
	const enabled = model.spec.enabled !== false;

	function setEnabled(next: boolean) {
		// A click during a save waits for it: the next PUT needs the saved
		// resourceVersion. The switch stays live so it never dims mid-save.
		if (toggle.isPending) return;
		toggle.mutate(
			{ model, enabled: next },
			{
				onSuccess: () =>
					toast("success", next ? "Model enabled." : "Model disabled."),
				onError: (err) => toastSaveError(err, "Failed to update model."),
			},
		);
	}

	return { enabled, canEdit, setEnabled };
}
