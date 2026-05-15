import { useUpdateHostKey } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type { HostKey } from "@/api/types/hostkey";
import { toast } from "@/components/Toast";
import { displayLabel } from "@/lib/displayLabel";

/**
 * Toggle a host key's `spec.enabled` flag. Shared between the host-keys table
 * row and the detail page header — both render a Switch wired to `setEnabled`.
 */
export function useToggleHostKeyEnabled() {
	const updateHostKey = useUpdateHostKey();

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
				`Host key "${displayLabel(hk.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update host key.",
			);
		}
	}

	return { setEnabled, isPending: updateHostKey.isPending };
}
