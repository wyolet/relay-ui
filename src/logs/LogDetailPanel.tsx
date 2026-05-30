import { MousePointerClick } from "lucide-react";
import { Suspense } from "react";
import { useLogDetail } from "@/api/hooks/logs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtInt, fmtMs, fmtTs, prettyBody, sumTokens } from "./format";
import { isErrorEvent } from "./predicates";

/**
 * Right pane of the logs view: the selected request's metadata plus its
 * captured request/response bodies. Fetches the full capture on demand.
 */
export function LogDetailPanel({ requestId }: { requestId: string | null }) {
	return (
		<div className="rounded-lg border border-border bg-card">
			{requestId === null ? (
				<Placeholder />
			) : (
				<Suspense key={requestId} fallback={<Loading />}>
					<PanelBody requestId={requestId} />
				</Suspense>
			)}
		</div>
	);
}

function PanelBody({ requestId }: { requestId: string }) {
	const { data } = useLogDetail(requestId);
	const { log, payload } = data;
	const isError = isErrorEvent(log);

	return (
		<div className="flex flex-col">
			<div className="border-b border-border px-4 py-3">
				<code className="block truncate font-mono text-xs text-muted-foreground">
					{log.request_id}
				</code>
			</div>
			<div className="flex flex-col gap-4 p-4">
				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
					<Meta label="Time">{fmtTs(log.ts)}</Meta>
					<Meta label="Source">
						<code className="font-mono">{log.source}</code>
					</Meta>
					<Meta label="Status">
						<span className={isError ? "text-destructive" : "text-foreground"}>
							{log.status}
							{log.error_kind ? ` · ${log.error_kind}` : ""}
						</span>
					</Meta>
					{log.error_message && <Meta label="Error">{log.error_message}</Meta>}
					{(log.model_id || log.requested_model) && (
						<Meta label="Model">
							<code className="font-mono">
								{log.model_id || log.requested_model}
							</code>
						</Meta>
					)}
					{log.host_id && (
						<Meta label="Host">
							<code className="font-mono">{log.host_id}</code>
						</Meta>
					)}
					{log.policy_id && (
						<Meta label="Policy">
							<code className="font-mono">{log.policy_id}</code>
						</Meta>
					)}
					<Meta label="Duration">{fmtMs(log.duration_ms)}</Meta>
					{log.tokens && (
						<Meta label="Tokens">{fmtInt(sumTokens(log.tokens))}</Meta>
					)}
					{log.finish_reason && <Meta label="Finish">{log.finish_reason}</Meta>}
					{log.streamed && <Meta label="Streamed">yes</Meta>}
				</dl>

				{payload ? (
					<>
						<Body
							title="Request"
							body={payload.request_body}
							truncated={payload.request_truncated}
						/>
						<Body
							title="Response"
							body={payload.response_body}
							truncated={payload.response_truncated}
						/>
					</>
				) : (
					<div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
						No bodies captured — this request's policy or relay key isn't opted
						into payload logging.
					</div>
				)}
			</div>
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
				<ScrollArea className="max-h-80 rounded-md border border-border bg-muted/30">
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

function Placeholder() {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
			<MousePointerClick
				className="mb-2 h-6 w-6 text-muted-foreground/60"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">
				Select a request
			</div>
			<div className="mt-1 max-w-xs text-xs text-muted-foreground">
				Pick a row to see its metadata and — when payload logging is on — the
				captured request and response bodies.
			</div>
		</div>
	);
}

function Loading() {
	return (
		<div className="py-16 text-center text-sm text-muted-foreground">
			Loading capture…
		</div>
	);
}
