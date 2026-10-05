import { useUpdateServiceAccount } from "@/api/hooks/serviceAccounts";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleServiceAccountEnabled() {
	const updateServiceAccount = useUpdateServiceAccount();
	const toastSaveError = useSaveErrorToast();

	async function setEnabled(sa: ServiceAccount, nextEnabled: boolean) {
		try {
			await updateServiceAccount.mutateAsync({
				id: sa.metadata.id ?? "",
				body: {
					metadata: sa.metadata,
					spec: { ...sa.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Service account "${displayLabel(sa.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update service account.");
		}
	}

	return { setEnabled, isPending: updateServiceAccount.isPending };
}
