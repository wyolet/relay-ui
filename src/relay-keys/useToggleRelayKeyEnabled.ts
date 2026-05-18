import { useUpdateRelayKey } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { RelayKey } from "@/api/types/relayKey";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleRelayKeyEnabled() {
	const updateRelayKey = useUpdateRelayKey();

	async function setEnabled(rk: RelayKey, nextEnabled: boolean) {
		try {
			await updateRelayKey.mutateAsync({
				id: rk.metadata.id ?? "",
				body: {
					metadata: rk.metadata,
					spec: { ...rk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Relay key "${displayLabel(rk.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update relay key.",
			);
		}
	}

	return { setEnabled, isPending: updateRelayKey.isPending };
}
