import { MousePointerClick, X } from "lucide-react";
import { Suspense, useState } from "react";
import { type LogDetail, useLogDetail } from "@/api/hooks/logs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Segmented } from "@/shared/Segmented";
import { failureAttribution } from "./attribution";
import { FailureLayerBadge } from "./FailureLayerBadge";
import { Field } from "./Field";
import { fmtInt, fmtMs, fmtTs, prettyBody, sumTokens } from "./format";
import { type ChatMessage, parseTranscript } from "./generation";
import { isErrorEvent } from "./predicates";
import { statusDot, statusTone } from "./statusStyle";
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
		<div className="overflow-hidden">
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
	const attribution = failureAttribution(log);
	const transcript = parseTranscript(payload);

	const [tab, setTab] = useState<"messages" | "raw">("messages");
	const modelLabel =
		labelFor?.("model", log.model_id) ??
		log.model_id ??
		log.requested_model ??
		log.source;

	return (
		<div className="flex flex-col">
			<div className="border-b border-rule pb-5">
				<div className="mb-4 flex items-center gap-2.5">
					<span
						className={cn(
							"size-2 rounded-full",
							statusDot(log.status, isError),
						)}
					/>
					<span
						className={cn(
							"text-label font-semibold tabular-nums",
							statusTone(log.status, isError),
						)}
					>
						{log.status}
					</span>
					<span className="truncate font-display text-section text-foreground">
						{modelLabel}
					</span>
					{attribution && <FailureLayerBadge layer={attribution.layer} />}
					{log.error_kind && (
						<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-meta text-destructive">
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

				<div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
					<Field label="Time">{fmtTs(log.ts)}</Field>
					<Field label="Latency">{fmtMs(log.duration_ms)}</Field>
					<Field label="Tokens">{fmtInt(sumTokens(log.tokens))}</Field>
					<Field label="Finish">{log.finish_reason ?? "—"}</Field>
					{(log.model_id || log.requested_model) && (
						<Field label="Requested">
							{log.requested_model || log.model_id}
						</Field>
					)}
					{log.host_id && (
						<Field label="Host">
							{labelFor?.("host", log.host_id) ?? log.host_id}
						</Field>
					)}
					{log.policy_id && (
						<Field label="Policy">
							{labelFor?.("policy", log.policy_id) ?? log.policy_id}
						</Field>
					)}
					<Field label="Runner">{log.source}</Field>
					{log.attempts !== undefined && log.attempts > 1 && (
						<Field label="Attempts">{String(log.attempts)}</Field>
					)}
					{log.streamed && <Field label="Streamed">yes</Field>}
				</div>

				{attribution && (
					<p className="mt-3 text-meta text-ink-2">{attribution.reason}</p>
				)}
				{log.error_message && (
					<p className="mt-3 text-meta text-destructive">{log.error_message}</p>
				)}
				<code className="mt-3 block truncate font-mono text-meta text-ink-3">
					{log.request_id}
				</code>
			</div>

			{transcript && (
				<Segmented
					variant="underline"
					value={tab}
					onChange={setTab}
					options={[
						{ value: "messages", label: "Messages" },
						{ value: "raw", label: "Raw" },
					]}
				/>
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

/** Compact transcript: role gutter + text, hairline-divided. */
function Transcript({ messages }: { messages: ChatMessage[] }) {
	return (
		<ul className="divide-y divide-rule">
			{messages.map((m) => (
				<li key={m.id} className="flex gap-4 py-3">
					<span className="w-20 shrink-0 text-meta text-ink-3 capitalize">
						{m.role}
					</span>
					<span className="whitespace-pre-wrap break-words text-label text-foreground">
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
				No bodies captured — this request's policy or key isn't opted into
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
				<span className="text-meta text-ink-3">{title}</span>
				{truncated && (
					<span className="text-meta text-destructive">truncated</span>
				)}
			</div>
			{text ? (
				<pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-grid p-3 font-mono text-meta text-foreground">
					{text}
				</pre>
			) : (
				<div className="rounded-md bg-grid px-3 py-4 text-center text-meta text-ink-3">
					Not captured
				</div>
			)}
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
