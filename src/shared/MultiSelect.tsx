import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterOption } from "@/filters/types";
import { cn } from "@/lib/utils";
import { OptionRow } from "@/shared/OptionRow";
import { SearchBox } from "@/shared/SearchBox";
import { WarningNotes } from "@/shared/WarningNotes";

/** Shared trigger chrome for filter-bar controls — the Button outline recipe,
 * so filter controls and buttons can never drift apart. */
export const filterTriggerClassName = cn(
	buttonVariants({ variant: "outline" }),
	"data-[popup-open]:bg-muted",
);

/** The "N selected/active" pip worn by filter triggers. */
export function CountBadge({ n }: { n: number }) {
	return (
		<span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">
			{n}
		</span>
	);
}

/** Checkbox list in a popover: the one multi-value facet picker. Options over
 * eight get a filter box, so long catalogs stay navigable. */
export function MultiSelect({
	label,
	options,
	selected,
	onToggle,
}: {
	label: string;
	options: readonly FilterOption[];
	selected: readonly string[];
	onToggle: (value: string) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger className={filterTriggerClassName}>
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

/** A check-list entry; a disabled one shows its state but can't be toggled. */
export interface CheckOption extends FilterOption {
	disabled?: boolean;
	hint?: string;
	/** Shown in the checked box in place of the tick, for an ordered pick. */
	rank?: number;
	/** Warnings under the row. */
	notes?: readonly string[];
}

interface MultiCheckListProps {
	options: readonly CheckOption[];
	selected: readonly string[];
	onToggle: (value: string) => void;
	emptyLabel: string;
}

/** The check list in a bordered box, as a form field. */
export function BoxedCheckList(props: MultiCheckListProps) {
	return (
		<div className="max-w-md rounded-md border border-border p-2">
			<MultiCheckList {...props} />
		</div>
	);
}

export function MultiCheckList({
	options,
	selected,
	onToggle,
	emptyLabel,
}: MultiCheckListProps) {
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
					const ranked = checked && o.rank !== undefined;
					return (
						<li key={o.value}>
							<OptionRow
								aria-pressed={checked}
								disabled={o.disabled}
								onClick={() => onToggle(o.value)}
								className="gap-2 rounded-md px-1 py-1.5 text-xs text-foreground hover:bg-muted/50 disabled:hover:bg-transparent"
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
									{ranked ? (
										<span className="text-[10px] font-medium tabular-nums">
											{o.rank}
										</span>
									) : (
										checked && <Check className="size-3" />
									)}
								</span>
								<span className="min-w-0 truncate">{o.label}</span>
								{ranked && (
									<span className="sr-only">{`, rank ${o.rank}`}</span>
								)}
								{o.hint && (
									<span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
										{o.hint}
									</span>
								)}
							</OptionRow>
							{o.notes && (
								<WarningNotes notes={o.notes} className="pb-1 pl-7" />
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
