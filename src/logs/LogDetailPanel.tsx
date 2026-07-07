import { MousePointerClick, X } from "lucide-react";
import { Suspense, useState } from "react";
import { type LogDetail, useLogDetail } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtInt, fmtMs, fmtTs, prettyBody, sumTokens } from "./format";
import { type ChatMessage, parseTranscript } from "./generation";
import { isErrorEvent } from "./predicates";
import type { LogLabeler } from "./useLogsFilterOptions";

/**
 * Right pane of the logs view: the selected request as a generation detail —
 * a summary header plus the chat transcript (when the bodies are chat/
 * completions) or the raw captured payload. Fetches the full capture on demand.
 */
export function LogDetailPanel({
	requestId,
	onClose,
	labelFor,
}: {
	requestId: string | null;
	onClose?: () => void;
	labelFor?: LogLabeler;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-border bg-card">
			{requestId === null ? (
				<Placeholder />
			) : (
				<Suspense key={requestId} fallback={<Loading />}>
					<PanelBody
						requestId={requestId}
						onClose={onClose}
						labelFor={labelFor}
					/>
				</Suspense>
			)}
		</div>
	);
}

function statusTone(status: number, isError: boolean): string {
	if (isError && status >= 500) return "text-destructive";
	if (isError) return "text-warning";
	return "text-success";
}
function statusDot(status: number, isError: boolean): string {
	if (isError && status >= 500) return "bg-destructive";
	if (isError) return "bg-warning";
	return "bg-success";
}

function PanelBody({
	requestId,
	onClose,
	labelFor,
}: {
	requestId: string;
	onClose?: () => void;
	labelFor?: LogLabeler;
}) {
	const { data } = useLogDetail(requestId);
	const { log, payload } = data;
	const isError = isErrorEvent(log);
	const transcript = parseTranscript(payload);

	const [tab, setTab] = useState<"messages" | "raw">("messages");
	const modelLabel =
		labelFor?.("model", log.model_id) ??
		log.model_id ??
		log.requested_model ??
		log.source;

	return (
		<div className="flex flex-col">
			<div className="border-b border-border p-3">
				<div className="mb-2 flex items-center gap-2">
					<span
						className={cn(
							"size-2 rounded-full",
							statusDot(log.status, isError),
						)}
					/>
					<span
						className={cn(
							"text-sm font-semibold tabular-nums",
							statusTone(log.status, isError),
						)}
					>
						{log.status}
					</span>
					<span className="text-xs text-muted-foreground">·</span>
					<code className="truncate font-mono text-xs text-foreground">
						{modelLabel}
					</code>
					{log.error_kind && (
						<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">
							{log.error_kind}
						</span>
					)}
					{onClose && (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={onClose}
							aria-label="Close inspector"
							className="ml-auto text-muted-foreground"
						>
							<X className="size-4" />
						</Button>
					)}
				</div>

				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
					<KV label="Time">{fmtTs(log.ts)}</KV>
					<KV label="Latency">{fmtMs(log.duration_ms)}</KV>
					<KV label="Tokens">{fmtInt(sumTokens(log.tokens))}</KV>
					<KV label="Finish">{log.finish_reason ?? "—"}</KV>
					{(log.model_id || log.requested_model) && (
						<KV label="Requested">{log.requested_model || log.model_id}</KV>
					)}
					{log.host_id && (
						<KV label="Host">
							{labelFor?.("host", log.host_id) ?? log.host_id}
						</KV>
					)}
					{log.policy_id && (
						<KV label="Policy">
							{labelFor?.("policy", log.policy_id) ?? log.policy_id}
						</KV>
					)}
					<KV label="Source">{log.source}</KV>
					{log.attempts !== undefined && log.attempts > 1 && (
						<KV label="Attempts">{String(log.attempts)}</KV>
					)}
					{log.streamed && <KV label="Streamed">yes</KV>}
				</div>

				{log.error_message && (
					<p className="mt-2 text-[11px] text-destructive">
						{log.error_message}
					</p>
				)}
				<code className="mt-2 block truncate font-mono text-[11px] text-muted-foreground">
					{log.request_id}
				</code>
			</div>

			{transcript && (
				<div className="flex gap-1 border-b border-border px-2">
					<TabButton
						active={tab === "messages"}
						onClick={() => setTab("messages")}
					>
						Messages
					</TabButton>
					<TabButton active={tab === "raw"} onClick={() => setTab("raw")}>
						Raw
					</TabButton>
				</div>
			)}

			<div className="max-h-[65vh] overflow-auto">
				{transcript && tab === "messages" ? (
					<Transcript messages={transcript} />
				) : (
					<RawBodies payload={payload} />
				)}
			</div>
		</div>
	);
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"border-b-2 px-2.5 py-2 text-xs transition-colors",
				active
					? "border-primary text-foreground"
					: "border-transparent text-muted-foreground hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

/** Compact transcript: role gutter + text, hairline-divided. */
function Transcript({ messages }: { messages: ChatMessage[] }) {
	return (
		<ul className="divide-y divide-border">
			{messages.map((m) => (
				<li key={m.id} className="flex gap-3 px-3 py-2">
					<span className="w-16 shrink-0 pt-px font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
						{m.role}
					</span>
					<span className="whitespace-pre-wrap break-words text-xs text-foreground">
						{m.content || (
							<span className="text-muted-foreground">(empty)</span>
						)}
					</span>
				</li>
			))}
		</ul>
	);
}

function RawBodies({ payload }: { payload: LogDetail["payload"] }) {
	if (!payload) {
		return (
			<div className="m-3 rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
				No bodies captured — this request's policy or relay key isn't opted into
				payload logging.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-3 p-3">
			<RawBody
				title="Request"
				body={payload.request_body}
				truncated={payload.request_truncated}
			/>
			<RawBody
				title="Response"
				body={payload.response_body}
				truncated={payload.response_truncated}
			/>
		</div>
	);
}

function RawBody({
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
				<pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-foreground">
					{text}
				</pre>
			) : (
				<div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
					Not captured
				</div>
			)}
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
				Pick a row to see its generation detail — the chat transcript and, when
				payload logging is on, the captured request and response bodies.
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
