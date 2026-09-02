import { useUpdateProject } from "@/api/hooks/projects";
import { ApiError } from "@/api/types/errors";
import type { Project } from "@/api/types/project";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleProjectEnabled() {
	const updateProject = useUpdateProject();

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
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update project.",
			);
		}
	}

	return { setEnabled, isPending: updateProject.isPending };
}
