import { ChevronDown, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import {
	type UsageSummaryFilter,
	useRollingUsageWindow,
} from "@/api/hooks/usage";
import {
	fieldFocusWithinClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";
import { Chip } from "@/shared/Chip";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { CountBadge, filterTriggerClassName } from "@/shared/MultiSelect";
import { DimensionChips } from "@/usage/filters/DimensionChips";
import {
	FILTER_DIMENSIONS,
	type FilterDimension,
} from "@/usage/filters/dimensions";
import {
	SINCE_HOURS,
	type Since,
	STATUS_OPTIONS,
	type StatusClass,
	WINDOW_OPTIONS,
} from "./logFilterConfig";

export type LogsFilterValues = {
	q: string;
	since: Since;
	status_class: StatusClass;
	errors: boolean;
	slow: boolean;
} & Record<FilterDimension, string[]>;

/** The usage slice matching the feed, so filter choices count the same rows. */
function usageSlice(values: LogsFilterValues): UsageSummaryFilter {
	const filter: UsageSummaryFilter = {};
	for (const d of FILTER_DIMENSIONS) {
		if (values[d].length) filter[d] = values[d];
	}
	if (values.status_class) filter.status_class = values.status_class;
	if (values.errors) filter.error = "true";
	return filter;
}

interface ActiveChip {
	key: string;
	label: string;
	onRemove: () => void;
}

/**
 * Explorer filter bar: a query box holding active facet chips + a text
 * refinement, with Window and a Filters panel on the right. Facets are added by
 * clicking values in the table or via the Filters panel; both surface as chips.
 */
export function LogsFilters({
	values,
	slowLabel,
	onChange,
}: {
	values: LogsFilterValues;
	slowLabel: string;
	onChange: (patch: Partial<LogsFilterValues>) => void;
}) {
	const [open, setOpen] = useState(false);
	const win = useRollingUsageWindow(SINCE_HOURS[values.since]);

	const setDim = (d: FilterDimension, next: string[]) => {
		const patch: Partial<Record<FilterDimension, string[]>> = {};
		patch[d] = next;
		onChange(patch);
	};
	const toggleDim = (d: FilterDimension, value: string) =>
		setDim(
			d,
			values[d].includes(value)
				? values[d].filter((v) => v !== value)
				: [...values[d], value],
		);

	const chips: ActiveChip[] = [];
	if (values.status_class)
		chips.push({
			key: "status",
			label: `status: ${values.status_class}`,
			onRemove: () => onChange({ status_class: "" }),
		});
	if (values.errors)
		chips.push({
			key: "errors",
			label: "errors",
			onRemove: () => onChange({ errors: false }),
		});
	if (values.slow)
		chips.push({
			key: "slow",
			label: slowLabel,
			onRemove: () => onChange({ slow: false }),
		});

	const advancedCount = chips.length;

	const resetAll = () =>
		onChange({ status_class: "", errors: false, slow: false });

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<div
					className={cn(
						"flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2.5 py-1",
						fieldFrameClassName,
						fieldFocusWithinClassName,
					)}
				>
					<Search className="size-4 shrink-0 text-muted-foreground" />
					{chips.map((c) => (
						<Chip
							key={c.key}
							label={c.label}
							onRemove={c.onRemove}
							labelClassName="max-w-44"
						/>
					))}
					<input
						value={values.q}
						onChange={(e) => onChange({ q: e.target.value })}
						placeholder={
							chips.length
								? "filter loaded rows…"
								: "filter loaded rows by model, source, id"
						}
						aria-label="Search loaded rows"
						className="h-7 min-w-24 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
					/>
				</div>

				<FilterDropdown
					align="start"
					label="Window"
					value={values.since}
					options={WINDOW_OPTIONS}
					onChange={(v) => onChange({ since: v })}
				/>

				<DimensionChips
					state={{
						values,
						toggle: toggleDim,
						clear: (d) => setDim(d, []),
						win,
						filter: usageSlice(values),
					}}
				/>

				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					className={cn(filterTriggerClassName, open && "bg-muted")}
				>
					<ListFilter className="size-3.5" aria-hidden="true" />
					More
					{advancedCount > 0 && <CountBadge n={advancedCount} />}
					<ChevronDown
						className={cn(
							"size-3.5 text-muted-foreground transition-transform",
							open && "rotate-180",
						)}
						aria-hidden="true"
					/>
				</button>
			</div>

			{open && (
				<div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2.5">
					<FilterDropdown
						align="start"
						label="Status"
						value={values.status_class}
						options={STATUS_OPTIONS}
						onChange={(v) => onChange({ status_class: v })}
					/>
					<ToggleButton
						label="Errors"
						pressed={values.errors}
						onToggle={() => onChange({ errors: !values.errors })}
					/>
					<ToggleButton
						label={slowLabel}
						pressed={values.slow}
						onToggle={() => onChange({ slow: !values.slow })}
					/>
					{advancedCount > 0 && (
						<button
							type="button"
							onClick={resetAll}
							className="ml-auto text-xs text-muted-foreground hover:text-foreground"
						>
							Reset
						</button>
					)}
				</div>
			)}
		</div>
	);
}

function ToggleButton({
	label,
	pressed,
	onToggle,
}: {
	label: string;
	pressed: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onToggle}
			className={cn(
				filterTriggerClassName,
				pressed && "border-primary/60 bg-primary/10 text-foreground",
			)}
		>
			{label}
		</button>
	);
}
