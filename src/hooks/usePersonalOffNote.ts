import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { groupsListQueryOptions } from "@/api/hooks/groups";
import { displayLabel } from "@/lib/displayLabel";
import { personalAccountOffNote } from "@/lib/personalAccount";

/** Why the caller's personal account is off; the group is named only when the caller can read the groups list. */
export function usePersonalOffNote(): string | undefined {
	const { personalAccountEffective: effective } = useAuth();
	const groupId =
		effective?.state === "off" && effective.source === "group"
			? effective.groupId
			: undefined;
	const { data } = useQuery({
		...groupsListQueryOptions,
		enabled: Boolean(groupId),
		retry: false,
	});
	const group = (data?.items ?? []).find((g) => g.metadata.id === groupId);
	return personalAccountOffNote(
		effective,
		group ? displayLabel(group.metadata) : undefined,
	);
}
