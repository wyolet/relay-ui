import { useUpdateHostKey } from "@/api/hooks/hostkeys";
import type { HostKey } from "@/api/types/hostkey";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

/**
 * Toggle a host key's `spec.enabled` flag. Shared between the host-keys table
 * row and the detail page header — both render a Switch wired to `setEnabled`.
 */
export function useToggleHostKeyEnabled() {
	const updateHostKey = useUpdateHostKey();
	const toastSaveError = useSaveErrorToast();

	async function setEnabled(hk: HostKey, nextEnabled: boolean) {
		try {
			await updateHostKey.mutateAsync({
				id: hk.metadata.id ?? "",
				body: {
					metadata: hk.metadata,
					spec: { ...hk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Credential "${displayLabel(hk.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update credential.");
		}
	}

	return { setEnabled, isPending: updateHostKey.isPending };
}
