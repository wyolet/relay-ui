import { USAGE_GROUP_BY } from "@/api/hooks/usage";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { Segmented, type SegmentedOption } from "@/shared/Segmented";
import { dimensionLabel } from "@/usage/format";
import { ExplorerFilters } from "./ExplorerFilters";
import { ExplorerRange } from "./ExplorerRange";
import type { Lens } from "./search";
import { useExplorer } from "./useExplorer";

const LENS_OPTIONS: SegmentedOption<Lens>[] = [
	{ value: "traffic", label: "Traffic" },
	{ value: "spend", label: "Spend" },
	{ value: "tokens", label: "Tokens" },
	{ value: "reliability", label: "Reliability" },
	{ value: "latency", label: "Latency" },
];

const GROUP_BY_OPTIONS = USAGE_GROUP_BY.map((g) => ({
	value: g,
	label: dimensionLabel(g),
}));

/** Title and range, then the lens tabs with the group-by, then filters. */
export function ExplorerBar() {
	const { live, set } = useExplorer();
	return (
		<div className="grid gap-5">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-bold text-foreground">Usage</h1>
				<ExplorerRange />
			</div>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<Segmented
					variant="underline"
					value={live.lens}
					options={LENS_OPTIONS}
					onChange={(lens) => set({ lens })}
				/>
				<FilterDropdown
					label="Group by"
					value={live.group_by}
					options={GROUP_BY_OPTIONS}
					onChange={(group_by) => set({ group_by })}
					align="end"
				/>
			</div>
			<ExplorerFilters />
		</div>
	);
}
