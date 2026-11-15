import {
	ArrowDownWideNarrow,
	ArrowUpNarrowWide,
	Check,
	ChevronDown,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	fieldFrameClassName,
	fieldInputFocusWithinClassName,
} from "@/components/ui/field-focus";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { SearchBox } from "@/shared/SearchBox";
import { activeFilterCount } from "./toQueryParams";
import {
	type FilterDef,
	type FilterState,
	type FilterValue,
	readBool,
	readText,
} from "./types";

export type SortDir = "asc" | "desc";

/** A list's sort control: one key and a direction. */
export interface SortControl<T extends string = string> {
	options: readonly { value: T; label: string }[];
	value: T;
	dir: SortDir;
	// Method syntax: a page's narrower key type still fits the bar's prop.
	onChange(value: T, dir: SortDir): void;
}

/** One segment inside the grouped field, split from the last by a rule. */
const SEGMENT =
	"flex h-full shrink-0 items-center gap-1.5 border-l border-field-border px-2.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/40 focus-visible:text-foreground";

/**
 * A list page's toolbar from its FilterDef[]: one grouped field holding the
 * search, a Filters toggle and the sort, page actions on the right, and the
 * filter controls in a row underneath while open. Purely presentational:
 * state and persistence (URL search params) are owned by the route; this
 * emits patches.
 */
export function FilterBar({
	defs,
	state,
	onChange,
	sort,
	actions,
	extra,
	extraActive = 0,
	className = "",
}: {
	defs: readonly FilterDef[];
	state: FilterState;
	/** Patch one or more keys; merge into the route's search params. */
	onChange: (patch: FilterState) => void;
	sort?: SortControl;
	/** Page buttons at the right end, e.g. the one "New …" action. */
	actions?: ReactNode;
	/** Filter controls that aren't FilterDefs (e.g. the owner filter). */
	extra?: ReactNode;
	/** How many of `extra`'s filters are narrowing, for the count. */
	extraActive?: number;
	className?: string;
}) {
	const search = defs.find((d) => d.type === "search");
	const controls = defs.filter((d) => d.type !== "search");
	const hasFilters = controls.length > 0 || extra != null;
	const active = activeFilterCount(controls, state);
	const narrowing = active + extraActive;
	const [open, setOpen] = useState(narrowing > 0);

	const clear = () => {
		const reset: FilterState = {};
		for (const d of controls)
			reset[d.key] = d.default ?? (d.type === "toggle" ? false : "");
		onChange(reset);
	};

	return (
		<div className={cn("grid gap-2", className)}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div
					className={cn(
						"flex h-8 w-full max-w-xl min-w-0 items-stretch overflow-hidden",
						fieldFrameClassName,
						fieldInputFocusWithinClassName,
					)}
				>
					{search && (
						<SearchBox
							bare
							className="min-w-0 flex-1"
							value={readText(state, search.key)}
							onChange={(v) => onChange({ [search.key]: v })}
							placeholder={
								search.type === "search" ? search.placeholder : undefined
							}
							aria-label={search.label}
						/>
					)}
					{hasFilters && (
						<button
							type="button"
							className={cn(SEGMENT, open && "text-foreground")}
							aria-expanded={open}
							onClick={() => setOpen((v) => !v)}
						>
							<SlidersHorizontal className="size-3.5" aria-hidden />
							Filters
							{narrowing > 0 && <Count n={narrowing} />}
						</button>
					)}
					{sort && <SortSegment sort={sort} />}
				</div>
				{actions && (
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{actions}
					</div>
				)}
			</div>
			{hasFilters && open && (
				<div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5">
					{controls.map((def) => (
						<Control
							key={def.key}
							def={def}
							state={state}
							onChange={onChange}
						/>
					))}
					{extra}
					{active > 0 && (
						<Button
							type="button"
							variant="ghost"
							onClick={clear}
							className="ml-auto text-muted-foreground"
						>
							<X className="size-3.5" aria-hidden />
							Clear
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

function Count({ n }: { n: number }) {
	return (
		<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-medium text-foreground tabular-nums">
			{n}
		</span>
	);
}

function SortSegment({ sort }: { sort: SortControl }) {
	const current = sort.options.find((o) => o.value === sort.value);
	const DirIcon = sort.dir === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className={SEGMENT} aria-label="Sort">
				<DirIcon className="size-3.5" aria-hidden />
				<span className="text-foreground">{current?.label ?? sort.value}</span>
				<ChevronDown className="size-3 opacity-60" aria-hidden />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-40">
				{sort.options.map((o) => (
					<DropdownMenuItem
						key={o.value}
						onClick={() => sort.onChange(o.value, sort.dir)}
					>
						<Check
							className={cn(
								"size-3.5",
								o.value === sort.value ? "opacity-100" : "opacity-0",
							)}
						/>
						{o.label}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				{(["asc", "desc"] as const).map((dir) => (
					<DropdownMenuItem
						key={dir}
						onClick={() => sort.onChange(sort.value, dir)}
					>
						<Check
							className={cn(
								"size-3.5",
								dir === sort.dir ? "opacity-100" : "opacity-0",
							)}
						/>
						{dir === "asc" ? "Ascending" : "Descending"}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Control({
	def,
	state,
	onChange,
}: {
	def: FilterDef;
	state: FilterState;
	onChange: (patch: FilterState) => void;
}) {
	if (def.type === "select") {
		const value = readText(state, def.key);
		const set = (v: FilterValue) => onChange({ [def.key]: v });
		return (
			<FilterDropdown
				label={def.label}
				value={value}
				options={def.options}
				onChange={set}
				align="start"
				active={value !== (def.default ?? "")}
			/>
		);
	}
	if (def.type === "toggle") {
		return (
			<Toggle
				variant="outline"
				pressed={readBool(state, def.key)}
				onPressedChange={(v) => onChange({ [def.key]: v })}
			>
				{def.label}
			</Toggle>
		);
	}
	return null;
}
