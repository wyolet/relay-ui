import { ScrollText } from "lucide-react";
import { useState } from "react";
import type { LogEvent } from "@/api/hooks/logs";
import { useLogs } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtMs, fmtTs, shortId, sumTokens } from "./format";
import { LogInspector } from "./LogInspector";
import { LogsEmpty } from "./LogsEmpty";

export function LogsTable({ errorsOnly }: { errorsOnly: boolean }) {
	const { events, fetchNextPage, hasNextPage, isFetchingNextPage } = useLogs();
	const [selected, setSelected] = useState<string | null>(null);

	const shown = errorsOnly ? events.filter(isErrorEvent) : events;

	if (events.length === 0) {
		return (
			<LogsEmpty
				icon={ScrollText}
				title="No logs yet"
				body="Requests through the relay land here, newest first. Opt a policy or relay-key into payload logging to also capture request and response bodies — click any row to inspect."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtInt(shown.length)} log{shown.length === 1 ? "" : "s"}
				{errorsOnly ? " (errors)" : ""} loaded · click a row to inspect
			</div>
			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full border-collapse text-sm">
					<thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>Time</Th>
							<Th>Request</Th>
							<Th>Source</Th>
							<Th>Model</Th>
							<Th className="text-right">Status</Th>
							<Th className="text-right">Duration</Th>
							<Th className="text-right">Tokens</Th>
						</tr>
					</thead>
					<tbody>
						{shown.map((e) => (
							<LogRow
								key={e.request_id}
								event={e}
								onSelect={() => setSelected(e.request_id)}
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

			<LogInspector requestId={selected} onClose={() => setSelected(null)} />
		</div>
	);
}

function isErrorEvent(e: LogEvent): boolean {
	return e.status >= 400 || Boolean(e.error_kind);
}

function LogRow({
	event,
	onSelect,
}: {
	event: LogEvent;
	onSelect: () => void;
}) {
	const isError = isErrorEvent(event);

	return (
		<tr
			onClick={onSelect}
			className="cursor-pointer border-t border-border hover:bg-muted/30 align-middle"
		>
			<Td className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
				{fmtTs(event.ts)}
			</Td>
			<Td>
				<code className="font-mono text-xs text-muted-foreground">
					{shortId(event.request_id)}
				</code>
			</Td>
			<Td>
				<code className="font-mono text-xs text-foreground">
					{event.source}
				</code>
			</Td>
			<Td>
				<code className="font-mono text-xs text-muted-foreground">
					{event.model_id || event.requested_model || "—"}
				</code>
			</Td>
			<Td className="text-right tabular-nums">
				<span className={isError ? "text-destructive" : "text-muted-foreground"}>
					{event.status}
					{event.error_kind ? ` ${event.error_kind}` : ""}
				</span>
			</Td>
			<Td className="text-right tabular-nums text-muted-foreground">
				{fmtMs(event.duration_ms)}
			</Td>
			<Td className="text-right tabular-nums">
				{fmtInt(sumTokens(event.tokens))}
			</Td>
		</tr>
	);
}

function Th({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-2 font-medium ${className || "text-left"}`}
		>
			{children}
		</th>
	);
}

function Td({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
