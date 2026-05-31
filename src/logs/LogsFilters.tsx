import { Check, ChevronDown, ListFilter, X } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterOption } from "@/filters/types";
import { cn } from "@/lib/utils";
import { FilterDropdown } from "@/shared/FilterDropdown";
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
const TRIGGER =
	"inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

/**
 * Logs filter bar: high-frequency Window/Status inline; everything else
 * (errors, slow, model/host/policy multi-selects) in a flat row that expands
 * under the bar from the Filters button. Active filters surface as chips below.
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

	const advancedCount =
		(values.errors ? 1 : 0) +
		(values.slow ? 1 : 0) +
		values.model_id.length +
		values.host_id.length +
		values.policy_id.length;

	const toggleDim = (key: LogDimensionKey, value: string) => {
		const cur = values[key];
		const next = cur.includes(value)
			? cur.filter((v) => v !== value)
			: [...cur, value];
		if (key === "model_id") onChange({ model_id: next });
		else if (key === "host_id") onChange({ host_id: next });
		else onChange({ policy_id: next });
	};

	const resetAdvanced = () =>
		onChange({
			errors: false,
			slow: false,
			model_id: [],
			host_id: [],
			policy_id: [],
		});

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SearchBox
					value={values.q}
					onChange={(v) => onChange({ q: v })}
					placeholder="filter loaded rows by model, source, id"
					aria-label="Search"
				/>

				<div className="flex flex-wrap items-center gap-2">
					<FilterDropdown
						label="Window"
						value={values.since}
						options={WINDOW_OPTIONS}
						onChange={(v) => onChange({ since: v })}
					/>
					<FilterDropdown
						label="Status"
						value={values.status_class}
						options={STATUS_OPTIONS}
						onChange={(v) => onChange({ status_class: v })}
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
			</div>

			{open && (
				<div className="flex flex-wrap items-center gap-2">
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
							onClick={resetAdvanced}
							className="ml-auto text-xs text-muted-foreground hover:text-foreground"
						>
							Reset
						</button>
					)}
				</div>
			)}

			{advancedCount > 0 && (
				<div className="flex flex-wrap items-center gap-1.5">
					{values.errors && (
						<Chip label="Errors" onRemove={() => onChange({ errors: false })} />
					)}
					{values.slow && (
						<Chip
							label={slowLabel}
							onRemove={() => onChange({ slow: false })}
						/>
					)}
					{LOG_DIMENSIONS.flatMap((dim) =>
						values[dim.key].map((v) => (
							<Chip
								key={`${dim.key}:${v}`}
								label={`${dim.chip}: ${labelFor(options[dim.key], v)}`}
								onRemove={() => toggleDim(dim.key, v)}
							/>
						)),
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
				pressed ? "border-primary/60 bg-primary/10 text-foreground" : "bg-card",
			)}
		>
			{label}
		</button>
	);
}

function labelFor(options: FilterOption[], value: string): string {
	return options.find((o) => o.value === value)?.label ?? value;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2.5 pr-1 text-[11px] text-foreground">
			<span className="max-w-44 truncate">{label}</span>
			<button
				type="button"
				onClick={onRemove}
				aria-label={`Remove ${label}`}
				className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				<X className="size-3" aria-hidden="true" />
			</button>
		</span>
	);
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
			<PopoverTrigger
				className={cn(TRIGGER, "bg-card data-[popup-open]:bg-muted")}
			>
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
					placeholder="Filter…"
					aria-label={`Filter ${emptyLabel}`}
				/>
			)}
			<ul className="max-h-48 overflow-y-auto">
				{filtered.map((o) => {
					const checked = selected.includes(o.value);
					return (
						<li key={o.value}>
							<button
								type="button"
								aria-pressed={checked}
								onClick={() => onToggle(o.value)}
								className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs text-foreground hover:bg-muted/50"
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
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
