import { ScrollText } from "lucide-react";
import { useState } from "react";
import type { PayloadRecord } from "@/api/hooks/payloads";
import { usePayloads } from "@/api/hooks/payloads";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtTs, shortId } from "./format";
import { LogInspector } from "./LogInspector";
import { LogsEmpty } from "./LogsEmpty";

export function LogsTable({ errorsOnly }: { errorsOnly: boolean }) {
	const { records, fetchNextPage, hasNextPage, isFetchingNextPage } =
		usePayloads();
	const [selected, setSelected] = useState<string | null>(null);

	const shown = errorsOnly ? records.filter(isErrorRecord) : records;

	if (records.length === 0) {
		return (
			<LogsEmpty
				icon={ScrollText}
				title="No captures yet"
				body="Opt a policy or relay-key into payload logging and its requests will be captured here — full request and response bodies, newest first."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				{fmtInt(shown.length)} capture{shown.length === 1 ? "" : "s"}
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
							<Th>Flags</Th>
						</tr>
					</thead>
					<tbody>
						{shown.map((r) => (
							<LogRow
								key={r.request_id}
								record={r}
								onSelect={() => setSelected(r.request_id)}
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

function isErrorRecord(r: PayloadRecord): boolean {
	return r.status >= 400 || Boolean(r.error_kind);
}

function LogRow({
	record,
	onSelect,
}: {
	record: PayloadRecord;
	onSelect: () => void;
}) {
	const isError = isErrorRecord(record);

	return (
		<tr
			onClick={onSelect}
			className="cursor-pointer border-t border-border hover:bg-muted/30 align-middle"
		>
			<Td className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
				{fmtTs(record.ts)}
			</Td>
			<Td>
				<code className="font-mono text-xs text-muted-foreground">
					{shortId(record.request_id)}
				</code>
			</Td>
			<Td>
				<code className="font-mono text-xs text-foreground">
					{record.source}
				</code>
			</Td>
			<Td>
				<code className="font-mono text-xs text-muted-foreground">
					{record.model_id || "—"}
				</code>
			</Td>
			<Td className="text-right tabular-nums">
				<span className={isError ? "text-destructive" : "text-muted-foreground"}>
					{record.status}
					{record.error_kind ? ` ${record.error_kind}` : ""}
				</span>
			</Td>
			<Td className="text-xs text-muted-foreground">
				{[
					record.streamed ? "streamed" : "",
					record.request_truncated || record.response_truncated
						? "truncated"
						: "",
				]
					.filter(Boolean)
					.join(" · ") || "—"}
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
