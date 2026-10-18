import { ChevronLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { STATUS_CLASS_VALUES, type StatusClass } from "@/logs/logFilterConfig";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { filterTriggerClassName, MultiCheckList } from "@/shared/MultiSelect";
import { OptionRow } from "@/shared/OptionRow";
import { dimensionLabel } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { FILTER_DIMENSIONS, type FilterDimension } from "./search";
import { useDimensionOptions } from "./useDimensionOptions";
import { useExplorer } from "./useExplorer";

const STATUS_OPTIONS = STATUS_CLASS_VALUES.map((v: StatusClass) => ({
	value: v,
	label: v === "" ? "Any status" : v,
}));

/** Active filters as chips, an "add filter" picker, and the status band. */
export function ExplorerFilters() {
	const { live, set } = useExplorer();
	const active = FILTER_DIMENSIONS.filter((d) => live[d].length > 0);
	const inactive = FILTER_DIMENSIONS.filter((d) => live[d].length === 0);
	return (
		<div className="flex flex-wrap items-center gap-2">
			{active.map((d) => (
				<DimensionChip key={d} dim={d} />
			))}
			{inactive.length > 0 && <AddFilter dims={inactive} />}
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

function DimensionChip({ dim }: { dim: FilterDimension }) {
	const { live, clear } = useExplorer();
	const labelFor = useGroupLabeler(dim);
	const values = live[dim];
	const summary =
		values.length === 1 ? labelFor(values[0] ?? "") : `${values.length}`;
	return (
		<span className="inline-flex items-center">
			<Popover>
				<PopoverTrigger className={`${filterTriggerClassName} rounded-r-none`}>
					<span className="text-ink-3">{dimensionLabel(dim)}</span>
					<span className="max-w-40 truncate">{summary}</span>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-2">
					<DimensionChecklist dim={dim} />
				</PopoverContent>
			</Popover>
			<button
				type="button"
				aria-label={`Clear ${dimensionLabel(dim)} filter`}
				onClick={() => clear(dim)}
				className={`${filterTriggerClassName} rounded-l-none border-l-0 px-1.5`}
			>
				<X className="size-3.5 text-ink-3" aria-hidden />
			</button>
		</span>
	);
}

function AddFilter({ dims }: { dims: FilterDimension[] }) {
	const [picked, setPicked] = useState<FilterDimension>();
	return (
		<Popover onOpenChange={(open) => !open && setPicked(undefined)}>
			<PopoverTrigger className={filterTriggerClassName}>
				<Plus className="size-3.5 text-ink-3" aria-hidden />
				Filter
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-2">
				{picked ? (
					<div className="grid gap-1">
						<button
							type="button"
							onClick={() => setPicked(undefined)}
							className="inline-flex items-center gap-1 px-1 text-meta text-ink-3 hover:text-foreground"
						>
							<ChevronLeft className="size-3.5" aria-hidden />
							{dimensionLabel(picked)}
						</button>
						<DimensionChecklist dim={picked} />
					</div>
				) : (
					<div className="grid">
						{dims.map((d) => (
							<OptionRow key={d} onClick={() => setPicked(d)}>
								<span className="text-label">{dimensionLabel(d)}</span>
							</OptionRow>
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

function DimensionChecklist({ dim }: { dim: FilterDimension }) {
	const { live, win, filter, toggle } = useExplorer();
	const { options, loading } = useDimensionOptions(dim, win, filter);
	if (loading) {
		return <p className="px-2 py-1.5 text-meta text-ink-3">Loading…</p>;
	}
	return (
		<MultiCheckList
			options={options}
			selected={live[dim]}
			onToggle={(v) => toggle(dim, v)}
			emptyLabel={`${dimensionLabel(dim).toLowerCase()} with traffic`}
		/>
	);
}
