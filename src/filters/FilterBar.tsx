import {
	ArrowDownWideNarrow,
	ArrowUpNarrowWide,
	Check,
	ChevronDown,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SearchBox } from "@/shared/SearchBox";
import { activeFilterCount } from "./toQueryParams";
import {
	type FilterDef,
	type FilterState,
	readBool,
	readText,
	type SelectFilter,
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
	summary,
	className = "",
}: {
	defs: readonly FilterDef[];
	state: FilterState;
	/** Patch one or more keys; merge into the route's search params. */
	onChange: (patch: FilterState) => void;
	sort?: SortControl;
	/** The page's actions at the right end as one split button (see
	 * `ToolbarActions`): the main action first, then secondary ones. */
	actions?: ReactNode;
	/** Filter controls that aren't FilterDefs (e.g. the owner filter). */
	extra?: ReactNode;
	/** How many of `extra`'s filters are narrowing, for the count. */
	extraActive?: number;
	/** One quiet line under the field about the results ("563 models"). */
	summary?: ReactNode;
	className?: string;
}) {
	const search = defs.find((d) => d.type === "search");
	const controls = defs.filter((d) => d.type !== "search");
	const selects = defs.filter((d): d is SelectFilter => d.type === "select");
	const toggles = defs.filter((d) => d.type === "toggle");
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
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div
					className={cn(
						"w-full min-w-0 overflow-hidden transition-[max-width]",
						open ? "max-w-3xl" : "max-w-xl",
						fieldFrameClassName,
						fieldInputFocusWithinClassName,
					)}
				>
					<div className="flex h-8 items-stretch">
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
						{active > 0 && (
							<button
								type="button"
								className={cn(SEGMENT, "px-2")}
								onClick={clear}
								aria-label="Clear filters"
								title="Clear filters"
							>
								<X className="size-3.5" aria-hidden />
							</button>
						)}
						{sort && <SortSegment sort={sort} />}
					</div>
					{hasFilters && open && (
						<div className="grid gap-2 border-t border-field-border px-3 py-2.5">
							{selects.map((def) => (
								<FacetRow
									key={def.key}
									def={def}
									value={readText(state, def.key)}
									onPick={(v) => onChange({ [def.key]: v })}
								/>
							))}
							{(toggles.length > 0 || extra != null) && (
								<div className="flex flex-wrap items-center gap-1.5">
									{toggles.map((def) => (
										<Pill
											key={def.key}
											selected={readBool(state, def.key)}
											onClick={() =>
												onChange({ [def.key]: !readBool(state, def.key) })
											}
										>
											{def.label}
										</Pill>
									))}
									{extra}
								</div>
							)}
						</div>
					)}
				</div>
				{actions && (
					<div className="flex h-8 shrink-0 items-stretch gap-px overflow-hidden rounded-md [&>*]:rounded-none!">
						{actions}
					</div>
				)}
			</div>
			{summary && <p className="text-meta text-ink-3">{summary}</p>}
		</div>
	);
}

/** Past this many options a facet stops listing pills and offers a search. */
const MAX_PILLS = 7;

/** A select filter as a labelled row of pills, one click per choice. A long
 * list keeps only its default and current pick as pills, the rest behind a
 * searchable picker. */
function FacetRow({
	def,
	value,
	onPick,
}: {
	def: SelectFilter;
	value: string;
	onPick: (value: string) => void;
}) {
	const long = def.options.length > MAX_PILLS;
	const shown = long
		? def.options.filter(
				(o) => o.value === (def.default ?? "") || o.value === value,
			)
		: def.options;
	return (
		<div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-2">
			<span className="text-meta text-ink-3">{def.label}</span>
			<div className="flex flex-wrap items-center gap-1.5">
				{shown.map((o) => (
					<Pill
						key={o.value}
						selected={o.value === value}
						onClick={() => onPick(o.value)}
					>
						{o.label}
					</Pill>
				))}
				{long && <FacetSearch def={def} value={value} onPick={onPick} />}
			</div>
		</div>
	);
}

function FacetSearch({
	def,
	value,
	onPick,
}: {
	def: SelectFilter;
	value: string;
	onPick: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className={cn(PILL, PILL_IDLE)}>
				<Search className="size-3" aria-hidden />
				Choose {def.label.toLowerCase()}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-0">
				<Command>
					<CommandInput placeholder={`Search ${def.label.toLowerCase()}`} />
					<CommandList className="max-h-64">
						<CommandEmpty>No match.</CommandEmpty>
						{def.options.map((o) => (
							<CommandItem
								key={o.value}
								value={o.label}
								data-checked={o.value === value}
								onSelect={() => {
									onPick(o.value);
									setOpen(false);
								}}
							>
								{o.label}
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

const PILL =
	"inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PILL_IDLE =
	"text-muted-foreground hover:bg-muted/60 hover:text-foreground";

/** One choice in a facet: quiet until picked. */
function Pill({
	selected,
	onClick,
	children,
}: {
	selected: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onClick}
			className={cn(
				PILL,
				selected
					? "bg-primary/15 text-foreground ring-1 ring-primary/40"
					: PILL_IDLE,
			)}
		>
			{children}
		</button>
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
