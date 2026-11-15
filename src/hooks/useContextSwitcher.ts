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

/** The switcher's rows (top-level; a form's pick lists every one), the current one's key and lines, a pick by key, and why Personal is missing. */
export function useContextSwitcher() {
	const { contexts, current, select, contextsLoaded } = useWorkContext();
	const allRows = contextRows(contexts);
	// The workspace is a person, team or the organization; projects stay a form's pick.
	const rows = allRows.filter((r) => !r.nested);

	function selectKey(key: string) {
		const row = allRows.find((r) => contextKey(r.context) === key);
		if (row) select(row.context);
	}

	// Opening the menu warms the form on screen's lists for every listed scope.
	function onOpenChange(open: boolean) {
		if (open) prefetchScopes(allRows.map((r) => contextUsableBy(r.context)));
	}

	return {
		rows,
		allRows,
		current,
		currentKey: current ? contextKey(current) : "",
		currentTitle: current ? contextTitle(current) : "",
		currentSubtitle: current ? contextSubtitle(current) : "",
		selectKey,
		onOpenChange,
		personalOffNote: usePersonalOffNote(),
		noContext: contextsLoaded && contexts.length === 0,
	};
}
