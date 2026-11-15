import { useSetKeyEnabled } from "@/api/hooks/keys";
import type { Key } from "@/api/types/key";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

/** A key's on/off switch: flips at once, one toast per key as it goes back
 * and forth. */
export function useToggleKeyEnabled() {
	const toggle = useSetKeyEnabled();
	const toastSaveError = useSaveErrorToast();

	function setEnabled(key: Key, enabled: boolean) {
		// A click during a save waits for it: the next PUT needs the saved
		// resourceVersion.
		if (toggle.isPending) return;
		toggle.mutate(
			{ key, enabled },
			{
				onSuccess: () =>
					toast(
						"success",
						`${displayLabel(key.metadata)} ${enabled ? "enabled" : "disabled"}`,
						undefined,
						`key-enabled:${key.metadata.id ?? key.metadata.name}`,
					),
				onError: (err) => toastSaveError(err, "Failed to update key."),
			},
		);
	}

	return { setEnabled, isPending: toggle.isPending };
}
