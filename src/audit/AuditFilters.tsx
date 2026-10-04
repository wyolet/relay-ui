import { ChevronDown, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import { useProjects } from "@/api/hooks/projects";
import { useTeams } from "@/api/hooks/teams";
import {
	fieldFocusWithinClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { Input } from "@/components/ui/input";
import type { FilterOption } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import { cn } from "@/lib/utils";
import { Chip } from "@/shared/Chip";
import { FilterDropdown } from "@/shared/FilterDropdown";
import {
	CountBadge,
	filterTriggerClassName,
	MultiSelect,
} from "@/shared/MultiSelect";
import {
	type AuditRange,
	type AuditStatus,
	parseScope,
	RANGE_OPTIONS,
	scopeValue,
	STATUS_OPTIONS,
} from "./auditFilterConfig";

export interface AuditFilterValues {
	range: AuditRange;
	from: string;
	to: string;
	actor: string;
	action: string[];
	kind: string[];
	scope: string[];
	status: AuditStatus;
}

interface ActiveChip {
	key: string;
	label: string;
	onRemove: () => void;
}

/**
 * Audit filter bar: an actor box holding the active facet chips, the time
 * range beside it, and the rest behind a Filters panel. Every facet here maps
 * to a server-side `/audit` query param — nothing is refined client-side.
 */
export function AuditFilters({
	values,
	actions,
	kinds,
	onChange,
}: {
	values: AuditFilterValues;
	actions: readonly string[];
	kinds: readonly string[];
	onChange: (patch: Partial<AuditFilterValues>) => void;
}) {
	const [open, setOpen] = useState(false);
	const { data: teamsData } = useTeams();
	const { data: projectsData } = useProjects();

	const scopeOptions: FilterOption[] = [
		...(teamsData.items ?? []).map((t) => ({
			value: scopeValue("team", t.metadata.id ?? ""),
			label: `Team · ${displayLabel(t.metadata)}`,
		})),
		...(projectsData.items ?? []).map((p) => ({
			value: scopeValue("project", p.metadata.id ?? ""),
			label: `Project · ${displayLabel(p.metadata)}`,
		})),
	];

	const toggle = (key: "action" | "kind" | "scope", value: string) => {
		const cur = values[key];
		const next = cur.includes(value)
			? cur.filter((v) => v !== value)
			: [...cur, value];
		onChange({ [key]: next });
	};

	const chips: ActiveChip[] = [];
	if (values.status)
		chips.push({
			key: "status",
			label: `outcome: ${values.status}`,
			onRemove: () => onChange({ status: "" }),
		});
	for (const v of values.action)
		chips.push({
			key: `action:${v}`,
			label: `action: ${v}`,
			onRemove: () => toggle("action", v),
		});
	for (const v of values.kind)
		chips.push({
			key: `kind:${v}`,
			label: `kind: ${v}`,
			onRemove: () => toggle("kind", v),
		});
	for (const v of values.scope)
		chips.push({
			key: `scope:${v}`,
			label: `scope: ${labelFor(scopeOptions, v)}`,
			onRemove: () => toggle("scope", v),
		});

	const resetAll = () =>
		onChange({ status: "", action: [], kind: [], scope: [] });

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
						value={values.actor}
						onChange={(e) => onChange({ actor: e.target.value })}
						placeholder="filter by actor username…"
						aria-label="Filter by actor"
						className="h-7 min-w-24 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
					/>
				</div>

				<FilterDropdown
					align="start"
					label="Range"
					value={values.range}
					options={RANGE_OPTIONS}
					onChange={(v) => onChange({ range: v })}
				/>

				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					className={cn(filterTriggerClassName, open && "bg-muted")}
				>
					<ListFilter className="size-3.5" aria-hidden="true" />
					Filters
					{chips.length > 0 && <CountBadge n={chips.length} />}
					<ChevronDown
						className={cn(
							"size-3.5 text-muted-foreground transition-transform",
							open && "rotate-180",
						)}
						aria-hidden="true"
					/>
				</button>
			</div>

			{values.range === "custom" && (
				<div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2.5">
					<BoundInput
						label="From"
						value={values.from}
						onChange={(v) => onChange({ from: v })}
					/>
					<BoundInput
						label="To"
						value={values.to}
						onChange={(v) => onChange({ to: v })}
					/>
					<p className="text-[11px] text-muted-foreground">
						Local time. Leave a bound empty to leave that side open.
					</p>
				</div>
			)}

			{open && (
				<div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2.5">
					<FilterDropdown
						align="start"
						label="Outcome"
						value={values.status}
						options={STATUS_OPTIONS}
						onChange={(v) => onChange({ status: v })}
					/>
					<MultiSelect
						label="Action"
						options={actions.map((a) => ({ value: a, label: a }))}
						selected={values.action}
						onToggle={(v) => toggle("action", v)}
					/>
					<MultiSelect
						label="Resource kind"
						options={kinds.map((k) => ({ value: k, label: k }))}
						selected={values.kind}
						onToggle={(v) => toggle("kind", v)}
					/>
					<MultiSelect
						label="Scope"
						options={scopeOptions}
						selected={values.scope}
						onToggle={(v) => toggle("scope", v)}
					/>
					{chips.length > 0 && (
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

function BoundInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = `audit-bound-${label.toLowerCase()}`;
	return (
		<div className="flex items-center gap-1.5">
			<label htmlFor={id} className="text-[11px] text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
				type="datetime-local"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-8 w-52 text-xs"
			/>
		</div>
	);
}

function labelFor(options: readonly FilterOption[], value: string): string {
	const hit = options.find((o) => o.value === value);
	if (hit) return hit.label;
	// A scope whose team/project row is gone still reads as what it targeted.
	const parsed = parseScope(value);
	return parsed ? `${parsed.kind} ${parsed.id.slice(0, 8)}…` : value;
}
