import { useUpdateKey } from "@/api/hooks/keys";
import type { Key } from "@/api/types/key";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleKeyEnabled() {
	const updateKey = useUpdateKey();
	const toastSaveError = useSaveErrorToast();

	async function setEnabled(rk: Key, nextEnabled: boolean) {
		try {
			await updateKey.mutateAsync({
				id: rk.metadata.id ?? "",
				body: {
					metadata: rk.metadata,
					spec: { ...rk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Key "${displayLabel(rk.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update key.");
		}
	}

	return { setEnabled, isPending: updateKey.isPending };
}
