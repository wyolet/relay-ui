import { ListOrdered } from "lucide-react";
import type { UsageEvent } from "@/api/hooks/usage";
import { useUsageEvents } from "@/api/hooks/usage";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtMs, fmtTs, sumTokens } from "./format";
import { UsageEmpty } from "./UsageEmpty";

export function UsageEventsTable() {
	const { events, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useUsageEvents();

	if (events.length === 0) {
		return (
			<UsageEmpty
				icon={ListOrdered}
				title="No events recorded yet"
				body="Individual requests through the relay will stream in here, newest first — status, latency, model, and token counts per call."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtInt(events.length)} event{events.length === 1 ? "" : "s"} loaded
				(newest first)
			</div>
			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full border-collapse text-sm">
					<thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>Time</Th>
							<Th>Source</Th>
							<Th>Model</Th>
							<Th className="text-right">Status</Th>
							<Th className="text-right">Duration</Th>
							<Th className="text-right">Tokens</Th>
							<Th>Detail</Th>
						</tr>
					</thead>
					<tbody>
						{events.map((e) => (
							<EventRow key={e.request_id} event={e} />
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

function EventRow({ event }: { event: UsageEvent }) {
	const isError = event.status >= 400 || Boolean(event.error_kind);
	const detail =
		event.error_message ||
		event.error_kind ||
		event.finish_reason ||
		(event.streamed ? "streamed" : "");

	return (
		<tr className="border-t border-border hover:bg-muted/30 align-top">
			<Td className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
				{fmtTs(event.ts)}
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
				<span
					className={isError ? "text-destructive" : "text-muted-foreground"}
				>
					{event.status}
				</span>
			</Td>
			<Td className="text-right tabular-nums text-muted-foreground">
				{fmtMs(event.duration_ms)}
			</Td>
			<Td className="text-right tabular-nums">
				{fmtInt(sumTokens(event.tokens))}
			</Td>
			<Td className="text-xs text-muted-foreground max-w-[28ch] truncate">
				{detail || "—"}
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
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
