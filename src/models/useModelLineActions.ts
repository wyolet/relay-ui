import { useSetModelEnabled } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
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
				onSuccess: () => toastModelEnabled(model, next),
				onError: (err) => toastSaveError(err, "Failed to update model."),
			},
		);
	}

	return { enabled, canEdit, setEnabled };
}

/** "Claude Opus 5.5 enabled": one toast per model, updated in place as it is
 * switched back and forth. */
export function toastModelEnabled(model: Model, enabled: boolean) {
	toast(
		"success",
		`${displayLabel(model.metadata)} ${enabled ? "enabled" : "disabled"}`,
		undefined,
		`model-enabled:${model.metadata.id ?? model.metadata.name}`,
	);
}
