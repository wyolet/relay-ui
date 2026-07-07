import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
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

/**
 * Renders a page's filters from its FilterDef[] — identical layout everywhere:
 * search boxes on the left, select/toggle chips on the right, optional actions,
 * and a Clear button once anything is active. Purely presentational: state and
 * persistence (URL search params) are owned by the route; this emits patches.
 */
export function FilterBar({
	defs,
	state,
	onChange,
	actions,
	className = "",
}: {
	defs: readonly FilterDef[];
	state: FilterState;
	/** Patch one or more keys; merge into the route's search params. */
	onChange: (patch: FilterState) => void;
	actions?: ReactNode;
	className?: string;
}) {
	const searches = defs.filter((d) => d.type === "search");
	const controls = defs.filter((d) => d.type !== "search");
	const active = activeFilterCount(defs, state);

	const clear = () => {
		const reset: FilterState = {};
		for (const d of defs)
			reset[d.key] = d.default ?? (d.type === "toggle" ? false : "");
		onChange(reset);
	};

	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
		>
			<div className="flex flex-wrap items-center gap-2 min-w-0">
				{searches.map((def) => (
					<SearchBox
						key={def.key}
						value={readText(state, def.key)}
						onChange={(v) => onChange({ [def.key]: v })}
						placeholder={def.type === "search" ? def.placeholder : undefined}
						aria-label={def.label}
					/>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-2 shrink-0">
				{controls.map((def) => (
					<Control key={def.key} def={def} state={state} onChange={onChange} />
				))}
				{active > 0 && (
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={clear}
						className="text-muted-foreground"
					>
						<X className="size-3.5" aria-hidden />
						Clear
						<span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-border/60 text-[10px] font-medium tabular-nums">
							{active}
						</span>
					</Button>
				)}
				{actions}
			</div>
		</div>
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
