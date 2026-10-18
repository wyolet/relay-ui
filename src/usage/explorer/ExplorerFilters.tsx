import { STATUS_CLASS_VALUES, type StatusClass } from "@/logs/logFilterConfig";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { DimensionChips } from "@/usage/filters/DimensionChips";
import { useExplorer } from "./useExplorer";

const STATUS_OPTIONS = STATUS_CLASS_VALUES.map((v: StatusClass) => ({
	value: v,
	label: v === "" ? "Any status" : v,
}));

/** Active filters as chips, an "add filter" picker, and the status band. */
export function ExplorerFilters() {
	const { live, win, filter, set, toggle, clear } = useExplorer();
	return (
		<div className="flex flex-wrap items-center gap-2">
			<DimensionChips state={{ values: live, toggle, clear, win, filter }} />
			<FilterDropdown
				label="Status"
				value={live.status_class}
				options={STATUS_OPTIONS}
				onChange={(v) => set({ status_class: v })}
				active={live.status_class !== ""}
			/>
		</div>
	);
}
