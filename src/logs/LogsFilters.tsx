import { Check, ChevronDown, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
	fieldFocusWithinClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterOption } from "@/filters/types";
import { cn } from "@/lib/utils";
import { Chip } from "@/shared/Chip";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { OptionRow } from "@/shared/OptionRow";
import { SearchBox } from "@/shared/SearchBox";
import {
	LOG_DIMENSIONS,
	type LogDimensionKey,
	type Since,
	STATUS_OPTIONS,
	type StatusClass,
	WINDOW_OPTIONS,
} from "./logFilterConfig";

/** Shared trigger style for every filter control so they line up identically. */
// Toolbar trigger chrome = the Button outline recipe, so filter controls and
// buttons can never drift apart again.
const TRIGGER = cn(
	buttonVariants({ variant: "outline" }),
	"data-[popup-open]:bg-muted",
);

export interface LogsFilterValues {
	q: string;
	since: Since;
	status_class: StatusClass;
	errors: boolean;
	slow: boolean;
	model_id: string[];
	host_id: string[];
	policy_id: string[];
}

type DimensionOptions = Record<LogDimensionKey, FilterOption[]>;

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
	options,
	slowLabel,
	onChange,
}: {
	values: LogsFilterValues;
	options: DimensionOptions;
	slowLabel: string;
	onChange: (patch: Partial<LogsFilterValues>) => void;
}) {
	const [open, setOpen] = useState(false);

	const toggleDim = (key: LogDimensionKey, value: string) => {
		const cur = values[key];
		const next = cur.includes(value)
			? cur.filter((v) => v !== value)
			: [...cur, value];
		if (key === "model_id") onChange({ model_id: next });
		else if (key === "host_id") onChange({ host_id: next });
		else onChange({ policy_id: next });
	};

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
	for (const dim of LOG_DIMENSIONS) {
		for (const v of values[dim.key]) {
			chips.push({
				key: `${dim.key}:${v}`,
				label: `${dim.chip}: ${labelFor(options[dim.key], v)}`,
				onRemove: () => toggleDim(dim.key, v),
			});
		}
	}

	const advancedCount = chips.length;

	const resetAll = () =>
		onChange({
			status_class: "",
			errors: false,
			slow: false,
			model_id: [],
			host_id: [],
			policy_id: [],
		});

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

				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					className={cn(TRIGGER, open && "bg-muted")}
				>
					<ListFilter className="size-3.5" aria-hidden="true" />
					Filters
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
					{LOG_DIMENSIONS.map((dim) => (
						<MultiSelectPopover
							key={dim.key}
							label={dim.label}
							options={options[dim.key]}
							selected={values[dim.key]}
							onToggle={(v) => toggleDim(dim.key, v)}
						/>
					))}
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

function CountBadge({ n }: { n: number }) {
	return (
		<span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">
			{n}
		</span>
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
				TRIGGER,
				pressed && "border-primary/60 bg-primary/10 text-foreground",
			)}
		>
			{label}
		</button>
	);
}

function labelFor(options: FilterOption[], value: string): string {
	return options.find((o) => o.value === value)?.label ?? value;
}

function MultiSelectPopover({
	label,
	options,
	selected,
	onToggle,
}: {
	label: string;
	options: FilterOption[];
	selected: string[];
	onToggle: (value: string) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger className={TRIGGER}>
				{label}
				{selected.length > 0 && <CountBadge n={selected.length} />}
				<ChevronDown
					className="size-3.5 text-muted-foreground"
					aria-hidden="true"
				/>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-2">
				<MultiCheckList
					options={options}
					selected={selected}
					onToggle={onToggle}
					emptyLabel={label.toLowerCase()}
				/>
			</PopoverContent>
		</Popover>
	);
}

function MultiCheckList({
	options,
	selected,
	onToggle,
	emptyLabel,
}: {
	options: FilterOption[];
	selected: string[];
	onToggle: (value: string) => void;
	emptyLabel: string;
}) {
	const [needle, setNeedle] = useState("");

	if (options.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				No {emptyLabel} available.
			</p>
		);
	}

	const filtered = needle
		? options.filter((o) =>
				o.label.toLowerCase().includes(needle.toLowerCase()),
			)
		: options;

	return (
		<div className="flex flex-col gap-2">
			{options.length > 8 && (
				<SearchBox
					value={needle}
					onChange={setNeedle}
					debounceMs={0}
					hotkey={false}
					placeholder="Filter…"
					aria-label={`Filter ${emptyLabel}`}
				/>
			)}
			<ul className="max-h-48 overflow-y-auto">
				{filtered.map((o) => {
					const checked = selected.includes(o.value);
					return (
						<li key={o.value}>
							<OptionRow
								aria-pressed={checked}
								onClick={() => onToggle(o.value)}
								className="gap-2 rounded-md px-1 py-1.5 text-xs text-foreground hover:bg-muted/50"
							>
								<span
									className={cn(
										"flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
										checked
											? "border-primary bg-primary text-primary-foreground"
											: "border-input",
									)}
									aria-hidden="true"
								>
									{checked && <Check className="size-3" />}
								</span>
								<span className="min-w-0 truncate">{o.label}</span>
							</OptionRow>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
