import { useSetPolicyEnabled } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

/** A policy's on/off switch: flips at once, one toast per policy as it goes
 * back and forth. */
export function useTogglePolicyEnabled() {
	const toggle = useSetPolicyEnabled();
	const toastSaveError = useSaveErrorToast();

	function setEnabled(policy: Policy, enabled: boolean) {
		// A click during a save waits for it: the next PUT needs the saved
		// resourceVersion.
		if (toggle.isPending) return;
		toggle.mutate(
			{ policy, enabled },
			{
				onSuccess: () =>
					toast(
						"success",
						`${displayLabel(policy.metadata)} ${enabled ? "enabled" : "disabled"}`,
						undefined,
						`policy-enabled:${policy.metadata.id ?? policy.metadata.name}`,
					),
				onError: (err) => toastSaveError(err, "Failed to update policy."),
			},
		);
	}

	return { setEnabled };
}
