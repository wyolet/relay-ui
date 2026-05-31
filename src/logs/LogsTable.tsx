import { ScrollText } from "lucide-react";
import type { LogEvent, LogsFilter } from "@/api/hooks/logs";
import { useLogs } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtInt, fmtMs, fmtTs, sumTokens } from "./format";
import { LogsEmpty } from "./LogsEmpty";
import { isErrorEvent } from "./predicates";
import type { LogLabeler } from "./useLogsFilterOptions";

/** Which dimension a click-to-filter affordance targets. */
export type LogFilterKey = "model_id" | "host_id" | "status_class";

/** Case-insensitive match across the fields a row exposes. */
function matchesQuery(e: LogEvent, needle: string): boolean {
	return [e.model_id, e.requested_model, e.source, e.request_id].some((v) =>
		v?.toLowerCase().includes(needle),
	);
}

function statusBand(status: number): string {
	return `${Math.floor(status / 100)}xx`;
}
function statusTone(e: LogEvent): string {
	if (!isErrorEvent(e)) return "text-emerald-600 dark:text-emerald-400";
	return e.status >= 500
		? "text-destructive"
		: "text-amber-600 dark:text-amber-400";
}
function statusDot(e: LogEvent): string {
	if (!isErrorEvent(e)) return "bg-emerald-500 dark:bg-emerald-400";
	return e.status >= 500 ? "bg-destructive" : "bg-amber-500 dark:bg-amber-400";
}

/**
 * Left pane of the logs view: a dense request feed. Structured filters are
 * applied server-side via `filter`; `query` is a client-side text refinement.
 * Clicking a model/host/status value calls `onFilter` to add a facet.
 */
export function LogsTable({
	selected,
	onSelect,
	onFilter,
	labelFor,
	query,
	filter,
	emptyBody,
	compact = false,
}: {
	selected: string | null;
	onSelect: (requestId: string) => void;
	/** Click-to-filter on a cell value. Omit to disable the affordance. */
	onFilter?: (key: LogFilterKey, value: string) => void;
	/** Resolve model/host ids to display names. Falls back to ids when absent. */
	labelFor?: LogLabeler;
	query: string;
	filter?: LogsFilter;
	emptyBody?: string;
	/** Hide secondary columns when an inspector is open beside the table. */
	compact?: boolean;
}) {
	const { events, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useLogs(filter);

	const needle = query.trim().toLowerCase();
	const shown =
		needle === "" ? events : events.filter((e) => matchesQuery(e, needle));

	if (events.length === 0) {
		return (
			<LogsEmpty
				icon={ScrollText}
				title="No logs yet"
				body={
					emptyBody ??
					"Requests through the relay land here, newest first. Opt a policy or relay-key into payload logging to also capture request and response bodies."
				}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="overflow-hidden rounded-lg border border-border bg-card">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
							<th className="px-3 py-2 font-medium">Time</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">Model</th>
							{!compact && <th className="px-3 py-2 font-medium">Host</th>}
							<th className="px-3 py-2 text-right font-medium">Latency</th>
							<th className="px-3 py-2 text-right font-medium">Tokens</th>
							{!compact && <th className="px-3 py-2 font-medium">Finish</th>}
						</tr>
					</thead>
					<tbody>
						{shown.map((e) => (
							<LogRow
								key={e.request_id}
								event={e}
								active={e.request_id === selected}
								compact={compact}
								labelFor={labelFor}
								onSelect={() => onSelect(e.request_id)}
								onFilter={onFilter}
							/>
						))}
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

function LogRow({
	event,
	active,
	compact,
	labelFor,
	onSelect,
	onFilter,
}: {
	event: LogEvent;
	active: boolean;
	compact: boolean;
	labelFor?: LogLabeler;
	onSelect: () => void;
	onFilter?: (key: LogFilterKey, value: string) => void;
}) {
	const modelLabel =
		labelFor?.("model", event.model_id) ??
		event.model_id ??
		event.requested_model ??
		event.source;
	const hostLabel = labelFor?.("host", event.host_id) ?? event.host_id ?? "—";
	return (
		<tr
			onClick={onSelect}
			className={cn(
				"cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40",
				active && "bg-muted/60",
			)}
		>
			<td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-muted-foreground">
				{fmtTs(event.ts)}
			</td>
			<td className="px-3 py-2">
				<Filterable
					value={statusBand(event.status)}
					onFilter={onFilter && ((v) => onFilter("status_class", v))}
				>
					<span className="inline-flex items-center gap-1.5">
						<span className={cn("size-1.5 rounded-full", statusDot(event))} />
						<span className={cn("font-mono tabular-nums", statusTone(event))}>
							{event.status}
						</span>
					</span>
				</Filterable>
			</td>
			<td className="max-w-0 px-3 py-2">
				<Filterable
					value={event.model_id ?? ""}
					onFilter={
						event.model_id && onFilter
							? (v) => onFilter("model_id", v)
							: undefined
					}
				>
					<span className="block truncate font-mono text-foreground">
						{modelLabel}
					</span>
				</Filterable>
			</td>
			{!compact && (
				<td className="px-3 py-2">
					<Filterable
						value={event.host_id ?? ""}
						onFilter={
							event.host_id && onFilter
								? (v) => onFilter("host_id", v)
								: undefined
						}
					>
						<span className="font-mono text-muted-foreground">{hostLabel}</span>
					</Filterable>
				</td>
			)}
			<td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
				{fmtMs(event.duration_ms)}
			</td>
			<td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
				{fmtInt(sumTokens(event.tokens))}
			</td>
			{!compact && (
				<td className="px-3 py-2">
					{event.error_kind ? (
						<span className="text-destructive">{event.error_kind}</span>
					) : (
						<span className="text-muted-foreground">
							{event.finish_reason ?? "—"}
						</span>
					)}
				</td>
			)}
		</tr>
	);
}

/** Wraps a cell value; when `onFilter` is set, clicking adds a facet (and
 * doesn't select the row). Otherwise renders the value inert. */
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
			className="-mx-1 rounded px-1 text-left hover:bg-primary/10 hover:text-primary"
		>
			{children}
		</button>
	);
}
