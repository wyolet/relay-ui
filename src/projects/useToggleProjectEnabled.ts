import { useUpdateProject } from "@/api/hooks/projects";
import type { Project } from "@/api/types/project";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleProjectEnabled() {
	const updateProject = useUpdateProject();
	const toastSaveError = useSaveErrorToast();

	async function setEnabled(project: Project, nextEnabled: boolean) {
		try {
			await updateProject.mutateAsync({
				id: project.metadata.id ?? "",
				body: {
					metadata: project.metadata,
					spec: { ...project.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Project "${displayLabel(project.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update project.");
		}
	}

	return { setEnabled, isPending: updateProject.isPending };
}
