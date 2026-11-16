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

/**
 * The switcher's rows (top-level; a form's pick lists every one, the
 * organization only when the form's kind may be owned by it), the current
 * one's key and lines, a pick by key, and why Personal is missing.
 */
export function useContextSwitcher(formOrganization = false) {
	const { contexts, current, select, contextsLoaded } = useWorkContext();
	const allRows = contextRows(contexts);
	// The workspace is a person, team or the organization; projects stay a form's pick.
	const rows = allRows.filter((r) => !r.nested);
	const formRows = formOrganization
		? allRows
		: allRows.filter((r) => r.context.kind !== "organization");

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
		formRows,
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
