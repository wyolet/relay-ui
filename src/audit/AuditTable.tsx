import { ChevronRight, ScrollText } from "lucide-react";
import { Fragment } from "react";
import type { AuditEvent, AuditFilter } from "@/api/hooks/audit";
import { useAudit } from "@/api/hooks/audit";
import { Button } from "@/components/ui/button";
import { fmtTs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LogsEmpty } from "@/logs/LogsEmpty";
import { OwnerLink } from "@/projects/OwnerLink";
import { Chip } from "@/shared/Chip";
import { ScopeChips } from "./ScopeChips";

/** Which facet a click-to-filter affordance targets. */
export type AuditFilterKey = "action" | "kind" | "actor";

const COLUMN_COUNT = 7;

function statusTone(status: string): string {
	if (status === "denied") return "text-destructive";
	if (status === "error") return "text-warning";
	return "text-success";
}

function statusDot(status: string): string {
	if (status === "denied") return "bg-destructive";
	if (status === "error") return "bg-warning";
	return "bg-success";
}

/**
 * The audit feed: one row per audited control-plane request, newest first,
 * expanding in place to show the HTTP request it came from and the JSON paths
 * a write touched. Denied and errored rows are tinted so a refusal is visible
 * without reading the outcome column.
 */
export function AuditTable({
	filter,
	expandedId,
	onToggle,
	onFilter,
}: {
	filter: AuditFilter;
	expandedId: string | null;
	onToggle: (id: string) => void;
	/** Click-to-filter on a cell value. Omit to disable the affordance. */
	onFilter?: (key: AuditFilterKey, value: string) => void;
}) {
	const { events, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useAudit(filter);

	if (events.length === 0) {
		return (
			<LogsEmpty
				icon={ScrollText}
				title="No audit events"
				body="Every mutating control-plane action, every denial, and every login lands here. Nothing matched this filter — widen the time range or clear a facet."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
							<th className="w-8" />
							<th className="px-3 py-2 font-medium">Time</th>
							<th className="px-3 py-2 font-medium">Actor</th>
							<th className="px-3 py-2 font-medium">Action</th>
							<th className="px-3 py-2 font-medium">Resource</th>
							<th className="px-3 py-2 font-medium">Scope</th>
							<th className="px-3 py-2 font-medium">Outcome</th>
						</tr>
					</thead>
					<tbody>
						{events.map((e) => {
							const expanded = e.id === expandedId;
							return (
								<Fragment key={e.id}>
									<AuditRow
										event={e}
										expanded={expanded}
										onToggle={() => onToggle(e.id)}
										onFilter={onFilter}
									/>
									{expanded && (
										<tr className="border-b border-border/60">
											<td colSpan={COLUMN_COUNT} className="bg-muted/20 p-0">
												<ExpandedDetail event={e} />
											</td>
										</tr>
									)}
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
			{hasNextPage && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						disabled={isFetchingNextPage}
						onClick={() => void fetchNextPage()}
					>
						{isFetchingNextPage ? "Loading…" : "Load older"}
					</Button>
				</div>
			)}
		</div>
	);
}

function AuditRow({
	event,
	expanded,
	onToggle,
	onFilter,
}: {
	event: AuditEvent;
	expanded: boolean;
	onToggle: () => void;
	onFilter?: (key: AuditFilterKey, value: string) => void;
}) {
	const denied = event.outcome.status === "denied";
	const errored = event.outcome.status === "error";
	const actor = event.actor.name || event.actor.id || event.actor.kind;
	return (
		<tr
			onClick={onToggle}
			className={cn(
				"cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40",
				denied && "bg-destructive/5",
				errored && "bg-warning/5",
				expanded && "bg-muted/40",
			)}
		>
			<td className="pl-3">
				<ChevronRight
					className={cn(
						"size-3.5 text-muted-foreground transition-transform",
						expanded && "rotate-90",
					)}
					aria-hidden="true"
				/>
			</td>
			<td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-muted-foreground">
				{fmtTs(event.ts)}
			</td>
			<td className="px-3 py-2">
				<Filterable
					value={event.actor.name ?? ""}
					onFilter={
						event.actor.name && onFilter
							? (v) => onFilter("actor", v)
							: undefined
					}
				>
					<span className="block max-w-[12rem] truncate text-foreground">
						{actor}
					</span>
					<span className="block text-[10px] text-muted-foreground">
						{event.actor.kind}
					</span>
				</Filterable>
			</td>
			<td className="px-3 py-2">
				<Filterable
					value={event.action}
					onFilter={onFilter && ((v) => onFilter("action", v))}
				>
					<span className="font-mono text-foreground">{event.action}</span>
				</Filterable>
			</td>
			<td className="px-3 py-2">
				<Filterable
					value={event.resource.kind}
					onFilter={onFilter && ((v) => onFilter("kind", v))}
				>
					<span className="block max-w-[16rem] truncate text-foreground">
						{event.resource.name || event.resource.id || event.resource.kind}
					</span>
					{(event.resource.name || event.resource.id) && (
						<span className="block text-[10px] text-muted-foreground">
							{event.resource.kind}
						</span>
					)}
				</Filterable>
			</td>
			<td className="px-3 py-2">
				<ScopeChips scope={event.resource.scope} />
			</td>
			<td className="px-3 py-2">
				<span className="inline-flex items-center gap-1.5">
					<span
						className={cn(
							"size-1.5 rounded-full",
							statusDot(event.outcome.status),
						)}
					/>
					<span className={statusTone(event.outcome.status)}>
						{event.outcome.status}
					</span>
					<span className="font-mono tabular-nums text-muted-foreground">
						{event.outcome.code}
					</span>
				</span>
			</td>
		</tr>
	);
}

/** Expanded-row body: the HTTP request the event came from, the owning
 * team/project, and the JSON paths a write touched (values are never recorded). */
function ExpandedDetail({ event }: { event: AuditEvent }) {
	const fields = event.change?.fields ?? [];
	return (
		<div className="flex flex-col gap-3 px-4 py-3">
			<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
				<KV label="Method">{event.request.method ?? "—"}</KV>
				<KV label="Path">{event.request.path ?? "—"}</KV>
				<KV label="Request id">{event.request.id ?? "—"}</KV>
				<KV label="Resource id">{event.resource.id ?? "—"}</KV>
				{event.actor.ip && <KV label="Actor IP">{event.actor.ip}</KV>}
				{event.actor.sessionId && (
					<KV label="Session">{event.actor.sessionId}</KV>
				)}
			</div>

			{(event.resource.owner || (event.resource.scope ?? []).length > 0) && (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						Owner
					</span>
					<OwnerLink owner={event.resource.owner} />
					<ScopeChips scope={event.resource.scope} />
				</div>
			)}

			<div className="flex flex-wrap items-center gap-1.5">
				<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
					Changed
				</span>
				{fields.length === 0 ? (
					<span className="text-[11px] text-muted-foreground">
						No field changes recorded.
					</span>
				) : (
					fields.map((f) => <Chip key={f} label={f} mono shape="box" />)
				)}
			</div>
		</div>
	);
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="min-w-0">
			<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="truncate font-mono text-xs text-foreground">{children}</dd>
		</div>
	);
}

/** Wraps a cell value; when `onFilter` is set, clicking adds a facet (and
 * doesn't toggle the row). Otherwise renders the value inert. */
function Filterable({
	value,
	onFilter,
	children,
}: {
	value: string;
	onFilter?: (value: string) => void;
	children: React.ReactNode;
}) {
	if (!onFilter) return <>{children}</>;
	return (
		<button
			type="button"
			title={`Filter by ${value}`}
			onClick={(ev) => {
				ev.stopPropagation();
				onFilter(value);
			}}
			className="-mx-1 block rounded px-1 text-left hover:bg-primary/10 hover:text-primary"
		>
			{children}
		</button>
	);
}
