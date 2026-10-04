import { useUpdateGroup } from "@/api/hooks/groups";
import { ApiError } from "@/api/types/errors";
import type { Group } from "@/api/types/group";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleGroupEnabled() {
	const updateGroup = useUpdateGroup();

	async function setEnabled(g: Group, nextEnabled: boolean) {
		try {
			await updateGroup.mutateAsync({
				id: g.metadata.id ?? "",
				body: {
					metadata: g.metadata,
					spec: { ...g.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Group "${displayLabel(g.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update group.",
			);
		}
	}

	return { setEnabled, isPending: updateGroup.isPending };
}
