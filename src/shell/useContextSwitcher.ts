import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { groupsListQueryOptions } from "@/api/hooks/groups";
import { useWorkContext } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { personalAccountOffNote } from "@/lib/personalAccount";
import { contextKey, contextRows } from "@/lib/workContext";

/** The switcher's rows, the current one's key, a pick by key, and why Personal is missing. */
export function useContextSwitcher() {
	const { contexts, current, select } = useWorkContext();
	const rows = contextRows(contexts);

	function selectKey(key: string) {
		const row = rows.find((r) => contextKey(r.context) === key);
		if (row) select(row.context);
	}

	return {
		rows,
		current,
		currentKey: current ? contextKey(current) : "",
		selectKey,
		personalOffNote: usePersonalOffNote(),
	};
}

/** The deciding group is named only when the caller can read the groups list. */
function usePersonalOffNote(): string | undefined {
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
