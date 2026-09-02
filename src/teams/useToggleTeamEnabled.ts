import { useUpdateTeam } from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import type { Team } from "@/api/types/team";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

export function useToggleTeamEnabled() {
	const updateTeam = useUpdateTeam();

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
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update team.",
			);
		}
	}

	return { setEnabled, isPending: updateTeam.isPending };
}
