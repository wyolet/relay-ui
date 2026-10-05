import { useUpdateTeam } from "@/api/hooks/teams";
import type { Team } from "@/api/types/team";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleTeamEnabled() {
	const updateTeam = useUpdateTeam();
	const toastSaveError = useSaveErrorToast();

	async function setEnabled(team: Team, nextEnabled: boolean) {
		try {
			await updateTeam.mutateAsync({
				id: team.metadata.id ?? "",
				body: {
					metadata: team.metadata,
					spec: { ...team.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Team "${displayLabel(team.metadata)}" ${
					nextEnabled ? "enabled" : "disabled"
				}.`,
			);
		} catch (err) {
			toastSaveError(err, "Failed to update team.");
		}
	}

	return { setEnabled, isPending: updateTeam.isPending };
}
