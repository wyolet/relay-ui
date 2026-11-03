import { usePersonalOffNote } from "@/hooks/usePersonalOffNote";
import { useWorkContext } from "@/hooks/useWorkContext";
import {
	contextKey,
	contextRows,
	contextSubtitle,
	contextTitle,
} from "@/lib/workContext";

/** The switcher's rows, the current one's key and lines, a pick by key, and why Personal is missing. */
export function useContextSwitcher() {
	const { contexts, current, select, contextsLoaded } = useWorkContext();
	const rows = contextRows(contexts);

	function selectKey(key: string) {
		const row = rows.find((r) => contextKey(r.context) === key);
		if (row) select(row.context);
	}

	return {
		rows,
		current,
		currentKey: current ? contextKey(current) : "",
		currentTitle: current ? contextTitle(current) : "",
		currentSubtitle: current ? contextSubtitle(current, contexts) : "",
		selectKey,
		personalOffNote: usePersonalOffNote(),
		noContext: contextsLoaded && contexts.length === 0,
	};
}
