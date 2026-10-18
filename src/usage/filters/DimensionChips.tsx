import { ChevronLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import type { UsageSummaryFilter, UsageWindow } from "@/api/hooks/usage";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { filterTriggerClassName, MultiCheckList } from "@/shared/MultiSelect";
import { OptionRow } from "@/shared/OptionRow";
import { dimensionLabel } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { FILTER_DIMENSIONS, type FilterDimension } from "./dimensions";
import { useDimensionOptions } from "./useDimensionOptions";

/** Where the chips read and write their values, and the slice their
 * options are counted over. */
export interface DimensionFilterState {
	values: Record<FilterDimension, string[]>;
	toggle: (d: FilterDimension, value: string) => void;
	clear: (d: FilterDimension) => void;
	win: UsageWindow;
	filter: UsageSummaryFilter;
}

/** Active dimension filters as chips, plus a picker to add one. Choices are
 * the values that saw traffic in the slice, busiest first. */
export function DimensionChips({ state }: { state: DimensionFilterState }) {
	const active = FILTER_DIMENSIONS.filter((d) => state.values[d].length > 0);
	const inactive = FILTER_DIMENSIONS.filter(
		(d) => state.values[d].length === 0,
	);
	return (
		<>
			{active.map((d) => (
				<DimensionChip key={d} dim={d} state={state} />
			))}
			{inactive.length > 0 && <AddFilter dims={inactive} state={state} />}
		</>
	);
}

function DimensionChip({
	dim,
	state,
}: {
	dim: FilterDimension;
	state: DimensionFilterState;
}) {
	const labelFor = useGroupLabeler(dim);
	const values = state.values[dim];
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
					<DimensionChecklist dim={dim} state={state} />
				</PopoverContent>
			</Popover>
			<button
				type="button"
				aria-label={`Clear ${dimensionLabel(dim)} filter`}
				onClick={() => state.clear(dim)}
				className={`${filterTriggerClassName} rounded-l-none border-l-0 px-1.5`}
			>
				<X className="size-3.5 text-ink-3" aria-hidden />
			</button>
		</span>
	);
}

function AddFilter({
	dims,
	state,
}: {
	dims: FilterDimension[];
	state: DimensionFilterState;
}) {
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
						<DimensionChecklist dim={picked} state={state} />
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

function DimensionChecklist({
	dim,
	state,
}: {
	dim: FilterDimension;
	state: DimensionFilterState;
}) {
	const { options, loading } = useDimensionOptions(
		dim,
		state.win,
		state.filter,
	);
	if (loading) {
		return <p className="px-2 py-1.5 text-meta text-ink-3">Loading…</p>;
	}
	return (
		<MultiCheckList
			options={options}
			selected={state.values[dim]}
			onToggle={(v) => state.toggle(dim, v)}
			emptyLabel={`${dimensionLabel(dim).toLowerCase()} with traffic`}
		/>
	);
}
