import { useWorkContext } from "@/hooks/useWorkContext";
import { contextKey, contextRows } from "@/lib/workContext";

/** The switcher's rows, the current one's key, and a pick by key. */
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
	};
}
