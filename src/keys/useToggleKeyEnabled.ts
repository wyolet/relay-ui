import { useUpdateKey } from "@/api/hooks/keys";
import { ApiError } from "@/api/types/errors";
import type { Key } from "@/api/types/key";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleKeyEnabled() {
	const updateKey = useUpdateKey();

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
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update key.",
			);
		}
	}

	return { setEnabled, isPending: updateKey.isPending };
}
