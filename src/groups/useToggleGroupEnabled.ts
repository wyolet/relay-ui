import { useAuth } from "@/api/auth";
import { useUpdateGroup } from "@/api/hooks/groups";
import type { Group } from "@/api/types/group";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleGroupEnabled() {
	const updateGroup = useUpdateGroup();
	const toastSaveError = useSaveErrorToast();
	const { isAdmin } = useAuth();

	async function setEnabled(g: Group, nextEnabled: boolean) {
		// personalAccount is admin-only; a non-admin's write leaves it out to keep it.
		const { personalAccount, ...spec } = g.spec;
		try {
			await updateGroup.mutateAsync({
				id: g.metadata.id ?? "",
				body: {
					metadata: g.metadata,
					spec: {
						...spec,
						enabled: nextEnabled,
						...(isAdmin && personalAccount ? { personalAccount } : {}),
					},
				},
			});
			toast(
				"success",
				`Group "${displayLabel(g.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update group.");
		}
	}

	return { setEnabled, isPending: updateGroup.isPending };
}
