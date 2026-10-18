import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDeferredValue } from "react";
import {
	type ExplorerSearch,
	explorerFilter,
	explorerWindow,
	type FilterDimension,
} from "./search";

/**
 * The explorer's state, read from and written to the URL. Controls read
 * `live`; lenses read the deferred `search`, so a change keeps the current
 * numbers on screen until the next ones load.
 */
export function useExplorer() {
	const live = useSearch({ from: "/_authenticated/usage" });
	const search = useDeferredValue(live);
	const navigate = useNavigate({ from: "/usage" });

	const set = (patch: Partial<ExplorerSearch>) =>
		void navigate({ search: (prev) => ({ ...prev, ...patch }) });

	const setValues = (d: FilterDimension, values: string[]) => {
		const patch: Partial<Record<FilterDimension, string[]>> = {};
		patch[d] = values;
		set(patch);
	};

	return {
		live,
		search,
		stale: search !== live,
		win: explorerWindow(search),
		filter: explorerFilter(search),
		set,
		toggle: (d: FilterDimension, value: string) =>
			setValues(
				d,
				live[d].includes(value)
					? live[d].filter((v) => v !== value)
					: [...live[d], value],
			),
		clear: (d: FilterDimension) => setValues(d, []),
	};
}
