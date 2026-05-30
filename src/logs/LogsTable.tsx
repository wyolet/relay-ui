import { ScrollText } from "lucide-react";
import type { LogEvent } from "@/api/hooks/logs";
import { useLogs } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtInt, fmtMs, fmtTs, sumTokens } from "./format";
import { LogsEmpty } from "./LogsEmpty";
import { isErrorEvent, isSlowEvent } from "./predicates";

/**
 * Left pane of the logs view: a scannable request feed. Selection and the
 * client-side filters are owned by the route (search params); this renders
 * the filtered rows and reports clicks.
 */
export function LogsTable({
	selected,
	onSelect,
	errorsOnly,
	slowOnly,
}: {
	selected: string | null;
	onSelect: (requestId: string) => void;
	errorsOnly: boolean;
	slowOnly: boolean;
}) {
	const { events, fetchNextPage, hasNextPage, isFetchingNextPage } = useLogs();

	const shown = events.filter(
		(e) => (!errorsOnly || isErrorEvent(e)) && (!slowOnly || isSlowEvent(e)),
	);

	if (events.length === 0) {
		return (
			<LogsEmpty
				icon={ScrollText}
				title="No logs yet"
				body="Requests through the relay land here, newest first. Opt a policy or relay-key into payload logging to also capture request and response bodies."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtInt(shown.length)}
				{shown.length !== events.length ? ` of ${fmtInt(events.length)}` : ""}{" "}
				log
				{shown.length === 1 ? "" : "s"}
			</div>
			<ScrollArea className="max-h-[70vh] rounded-lg border border-border bg-card">
				<ul className="divide-y divide-border">
					{shown.map((e) => (
						<LogRow
							key={e.request_id}
							event={e}
							active={e.request_id === selected}
							onSelect={() => onSelect(e.request_id)}
						/>
					))}
				</ul>
			</ScrollArea>
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
	onSelect,
}: {
	event: LogEvent;
	active: boolean;
	onSelect: () => void;
}) {
	const isError = isErrorEvent(event);

	return (
		<li>
			<button
				type="button"
				onClick={onSelect}
				className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40 ${
					active ? "bg-muted/60" : ""
				}`}
			>
				<span
					className={`h-1.5 w-1.5 shrink-0 rounded-full ${
						isError ? "bg-destructive" : "bg-primary/70"
					}`}
					aria-hidden
				/>
				<span className="w-32 shrink-0 text-xs text-muted-foreground tabular-nums">
					{fmtTs(event.ts)}
				</span>
				<code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
					{event.model_id || event.requested_model || event.source}
				</code>
				<span
					className={`w-10 shrink-0 text-right text-xs tabular-nums ${
						isError ? "text-destructive" : "text-muted-foreground"
					}`}
				>
					{event.status}
				</span>
				<span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
					{fmtMs(event.duration_ms)}
				</span>
				<span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
					{fmtInt(sumTokens(event.tokens))}
				</span>
			</button>
		</li>
	);
}
