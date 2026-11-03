import { usePersonalOffNote } from "@/hooks/usePersonalOffNote";
import { prefetchScopes } from "@/hooks/useScopePrefetch";
import { useWorkContext } from "@/hooks/useWorkContext";
import {
	contextKey,
	contextRows,
	contextSubtitle,
	contextTitle,
	contextUsableBy,
} from "@/lib/workContext";

/** The switcher's rows, the current one's key and lines, a pick by key, and why Personal is missing. */
export function useContextSwitcher() {
	const { contexts, current, select, contextsLoaded } = useWorkContext();
	const rows = contextRows(contexts);

	function selectKey(key: string) {
		const row = rows.find((r) => contextKey(r.context) === key);
		if (row) select(row.context);
	}

	// Opening the menu warms the form on screen's lists for every listed scope.
	function onOpenChange(open: boolean) {
		if (open) prefetchScopes(rows.map((r) => contextUsableBy(r.context)));
	}

	return {
		rows,
		current,
		currentKey: current ? contextKey(current) : "",
		currentTitle: current ? contextTitle(current) : "",
		currentSubtitle: current ? contextSubtitle(current, contexts) : "",
		selectKey,
		onOpenChange,
		personalOffNote: usePersonalOffNote(),
		noContext: contextsLoaded && contexts.length === 0,
	};
}
