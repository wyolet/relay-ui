import { Suspense } from "react";
import { usePayloadRecord } from "@/api/hooks/payloads";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtTs, prettyBody } from "./format";

/**
 * Per-request inspector. Controlled by `requestId`: open when non-null,
 * fetches the full captured Record (bodies included) on demand.
 */
export function LogInspector({
	requestId,
	onClose,
}: {
	requestId: string | null;
	onClose: () => void;
}) {
	return (
		<Dialog open={requestId !== null} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Request inspector</DialogTitle>
					<DialogDescription>
						<code className="font-mono text-xs">{requestId ?? ""}</code>
					</DialogDescription>
				</DialogHeader>
				{requestId !== null && (
					<Suspense fallback={<Loading />}>
						<InspectorBody requestId={requestId} />
					</Suspense>
				)}
			</DialogContent>
		</Dialog>
	);
}

function InspectorBody({ requestId }: { requestId: string }) {
	const { data: record } = usePayloadRecord(requestId);
	const isError = record.status >= 400 || Boolean(record.error_kind);

	return (
		<div className="flex flex-col gap-4">
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
				<Meta label="Time">{fmtTs(record.ts)}</Meta>
				<Meta label="Source">
					<code className="font-mono">{record.source}</code>
				</Meta>
				<Meta label="Status">
					<span className={isError ? "text-destructive" : "text-foreground"}>
						{record.status}
						{record.error_kind ? ` · ${record.error_kind}` : ""}
					</span>
				</Meta>
				{record.model_id && (
					<Meta label="Model">
						<code className="font-mono">{record.model_id}</code>
					</Meta>
				)}
				{record.host_id && (
					<Meta label="Host">
						<code className="font-mono">{record.host_id}</code>
					</Meta>
				)}
				{record.policy_id && (
					<Meta label="Policy">
						<code className="font-mono">{record.policy_id}</code>
					</Meta>
				)}
				{record.streamed && <Meta label="Streamed">yes</Meta>}
			</dl>

			<Body
				title="Request"
				body={record.request_body}
				truncated={record.request_truncated}
			/>
			<Body
				title="Response"
				body={record.response_body}
				truncated={record.response_truncated}
			/>
		</div>
	);
}

function Body({
	title,
	body,
	truncated,
}: {
	title: string;
	body: string | undefined;
	truncated: boolean | undefined;
}) {
	const text = prettyBody(body);
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</span>
				{truncated && (
					<span className="text-[10px] text-destructive">truncated</span>
				)}
			</div>
			{text ? (
				<ScrollArea className="max-h-72 rounded-md border border-border bg-muted/30">
					<pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words text-foreground">
						{text}
					</pre>
				</ScrollArea>
			) : (
				<div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
					Not captured
				</div>
			)}
		</div>
	);
}

function Meta({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-foreground">{children}</dd>
		</>
	);
}

function Loading() {
	return (
		<div className="py-8 text-center text-sm text-muted-foreground">
			Loading capture…
		</div>
	);
}
