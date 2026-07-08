import { ChevronRight, ScrollText } from "lucide-react";
import { Fragment, Suspense } from "react";
import type { LogEvent, LogsFilter } from "@/api/hooks/logs";
import { useLogDetail, useLogs } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { failureAttribution } from "./attribution";
import { FailureLayerBadge } from "./FailureLayerBadge";
import { fmtInt, fmtMs, fmtTs, sumTokens } from "./format";
import { LogsEmpty } from "./LogsEmpty";
import { isErrorEvent } from "./predicates";
import type { LogLabeler } from "./useLogsFilterOptions";

/** Which dimension a click-to-filter affordance targets. */
export type LogFilterKey = "model_id" | "host_id" | "status_class";

const COLUMN_COUNT = 8;

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
	if (!isErrorEvent(e)) return "text-success";
	return e.status >= 500 ? "text-destructive" : "text-warning";
}
function statusDot(e: LogEvent): string {
	if (!isErrorEvent(e)) return "bg-success";
	return e.status >= 500 ? "bg-destructive" : "bg-warning";
}

/**
 * The request feed: a dense table whose rows expand in place to show a summary.
 * Structured filters apply server-side via `filter`; `query` is a client-side
 * text refinement. Clicking a model/host/status value adds a facet; the
 * expanded row links to the full request page when bodies were captured.
 */
export function LogsTable({
	expandedId,
	onToggle,
	onOpenRequest,
	onFilter,
	labelFor,
	query,
	filter,
	emptyBody,
}: {
	expandedId: string | null;
	onToggle: (requestId: string) => void;
	/** Navigate to the full request page (called when a capture exists). */
	onOpenRequest: (requestId: string) => void;
	/** Click-to-filter on a cell value. Omit to disable the affordance. */
	onFilter?: (key: LogFilterKey, value: string) => void;
	/** Resolve model/host ids to display names. Falls back to ids when absent. */
	labelFor?: LogLabeler;
	query: string;
	filter?: LogsFilter;
	emptyBody?: string;
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
							<th className="w-8" />
							<th className="px-3 py-2 font-medium">Time</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">Model</th>
							<th className="px-3 py-2 font-medium">Host</th>
							<th className="px-3 py-2 text-right font-medium">Latency</th>
							<th className="px-3 py-2 text-right font-medium">Tokens</th>
							<th className="px-3 py-2 font-medium">Finish</th>
						</tr>
					</thead>
					<tbody>
						{shown.map((e) => {
							const expanded = e.request_id === expandedId;
							return (
								<Fragment key={e.request_id}>
									<LogRow
										event={e}
										expanded={expanded}
										labelFor={labelFor}
										onToggle={() => onToggle(e.request_id)}
										onFilter={onFilter}
									/>
									{expanded && (
										<tr className="border-b border-border/60">
											<td colSpan={COLUMN_COUNT} className="bg-muted/20 p-0">
												<ExpandedDetail
													event={e}
													labelFor={labelFor}
													onOpen={() => onOpenRequest(e.request_id)}
												/>
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

function LogRow({
	event,
	expanded,
	labelFor,
	onToggle,
	onFilter,
}: {
	event: LogEvent;
	expanded: boolean;
	labelFor?: LogLabeler;
	onToggle: () => void;
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
			onClick={onToggle}
			className={cn(
				"cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40",
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
			<td className="px-3 py-2">
				<Filterable
					value={event.model_id ?? ""}
					onFilter={
						event.model_id && onFilter
							? (v) => onFilter("model_id", v)
							: undefined
					}
				>
					<span className="block max-w-[14rem] truncate font-mono text-foreground">
						{modelLabel}
					</span>
				</Filterable>
			</td>
			<td className="px-3 py-2">
				<Filterable
					value={event.host_id ?? ""}
					onFilter={
						event.host_id && onFilter
							? (v) => onFilter("host_id", v)
							: undefined
					}
				>
					<span className="block max-w-[10rem] truncate font-mono text-muted-foreground">
						{hostLabel}
					</span>
				</Filterable>
			</td>
			<td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
				{fmtMs(event.duration_ms)}
			</td>
			<td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
				{fmtInt(sumTokens(event.tokens))}
			</td>
			<td className="px-3 py-2">
				<FinishCell event={event} />
			</td>
		</tr>
	);
}

/** Finish column: the finish reason for successes; for failures, the
 * failing layer + error kind so "us or them?" reads off the row. */
function FinishCell({ event }: { event: LogEvent }) {
	const attribution = failureAttribution(event);
	if (!attribution) {
		return (
			<span className="text-muted-foreground">
				{event.finish_reason ?? "—"}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5">
			<FailureLayerBadge layer={attribution.layer} />
			{event.error_kind && (
				<span className="text-destructive">{event.error_kind}</span>
			)}
		</span>
	);
}

/** Expanded-row body: the request summary plus a link to the full page when a
 * payload was captured (checked lazily on expand). */
function ExpandedDetail({
	event,
	labelFor,
	onOpen,
}: {
	event: LogEvent;
	labelFor?: LogLabeler;
	onOpen: () => void;
}) {
	const attribution = failureAttribution(event);
	return (
		<div className="flex flex-col gap-3 px-4 py-3">
			<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
				<KV label="Latency">{fmtMs(event.duration_ms)}</KV>
				<KV label="Tokens">{fmtInt(sumTokens(event.tokens))}</KV>
				<KV label="Finish">{event.finish_reason ?? "—"}</KV>
				<KV label="Runner">{event.source}</KV>
				{attribution && (
					<KV label="Failed layer">
						<FailureLayerBadge layer={attribution.layer} />
					</KV>
				)}
				{event.requested_model && (
					<KV label="Requested">{event.requested_model}</KV>
				)}
				{event.policy_id && (
					<KV label="Policy">
						{labelFor?.("policy", event.policy_id) ?? event.policy_id}
					</KV>
				)}
				{event.attempts !== undefined && event.attempts > 1 && (
					<KV label="Attempts">{String(event.attempts)}</KV>
				)}
				{event.streamed && <KV label="Streamed">yes</KV>}
			</div>

			{attribution && (
				<p className="text-[11px] text-muted-foreground">
					{attribution.reason}
				</p>
			)}
			{event.error_message && (
				<p className="text-[11px] text-destructive">{event.error_message}</p>
			)}
			<code className="font-mono text-[11px] text-muted-foreground">
				{event.request_id}
			</code>

			<Suspense
				fallback={
					<span className="text-xs text-muted-foreground">
						Checking capture…
					</span>
				}
			>
				<PayloadAffordance requestId={event.request_id} onOpen={onOpen} />
			</Suspense>
		</div>
	);
}

/** Renders a link to the full request page when bodies were captured, else a
 * quiet "nothing more to see" note — so we only leave the table when there's
 * a payload to inspect. */
function PayloadAffordance({
	requestId,
	onOpen,
}: {
	requestId: string;
	onOpen: () => void;
}) {
	const { data } = useLogDetail(requestId);
	if (!data.payload) {
		return (
			<span className="text-xs text-muted-foreground">
				No request/response bodies captured for this request.
			</span>
		);
	}
	return (
		<Button
			type="button"
			variant="link"
			onClick={onOpen}
			className="h-auto w-fit px-0"
		>
			View transcript &amp; raw →
		</Button>
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
			className="-mx-1 rounded px-1 text-left hover:bg-primary/10 hover:text-primary"
		>
			{children}
		</button>
	);
}
