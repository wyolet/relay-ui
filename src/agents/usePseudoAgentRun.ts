import { useEffect, useRef, useState } from "react";
import { type AgentRefusal, agentRefusal } from "@/agents/agentRefusal";
import { createdAgent } from "@/agents/pseudoAgentBody";
import type { CreatedAgent } from "@/agents/useAgentWrites";
import {
	type PseudoAgent,
	useCreatePseudoAgent,
	useDryRunPseudoAgent,
} from "@/api/hooks/pseudoAgents";
import type { components } from "@/api/types.gen";
import type { StepFormWrites } from "@/shared/StepForm";

type CreatedRow = components["schemas"]["CreatedRow"];

interface PreviewRequest {
	body: PseudoAgent;
	onRefused: (refusal: AgentRefusal) => void;
}

const PREVIEW_DEBOUNCE_MS = 400;

/**
 * The agent made in one request: a dry run lists what it would make, the
 * submit makes it all or nothing, so there is no per-write progress to retry.
 * One dry run is in flight at a time; a newer request waits for it and drops
 * its answer.
 */
export function usePseudoAgentRun() {
	const create = useCreatePseudoAgent();
	const dryRun = useDryRunPseudoAgent();
	const [created, setCreated] = useState<CreatedAgent | null>(null);
	// The last dry run's list, kept on screen while a newer one runs.
	const [previewRows, setPreviewRows] = useState<CreatedRow[] | null>(null);
	const [previewWaiting, setPreviewWaiting] = useState(false);
	const inFlight = useRef(false);
	const queued = useRef<PreviewRequest | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	// Success stays "running" until `created` is set from the answer.
	const sending = create.isPending || create.isSuccess;
	const run: StepFormWrites = {
		phase: created ? "done" : sending ? "running" : "idle",
		steps: [],
		doneCount: 0,
		error: null,
		retry: () => Promise.resolve(),
		reset() {
			setCreated(null);
			create.reset();
		},
	};

	function send(request: PreviewRequest) {
		inFlight.current = true;
		dryRun.mutate(request.body, {
			onSuccess: (answer) => {
				if (!queued.current) setPreviewRows(answer.created ?? []);
			},
			onError: (err) => {
				if (queued.current) return;
				setPreviewRows(null);
				request.onRefused(agentRefusal(err));
			},
			onSettled: () => {
				inFlight.current = false;
				const next = queued.current;
				queued.current = null;
				if (next) send(next);
			},
		});
	}

	function cancelWaiting() {
		clearTimeout(timer.current);
		setPreviewWaiting(false);
	}

	function preview(request: PreviewRequest) {
		cancelWaiting();
		if (inFlight.current) queued.current = request;
		else send(request);
	}

	return {
		run,
		created,
		previewRows: previewRows ?? [],
		/** No list yet: what Create makes is still being asked. */
		previewLoading:
			previewRows === null && (previewWaiting || dryRun.isPending),
		/** A list is shown, but answers changed since it was asked. */
		previewStale: previewRows !== null && (previewWaiting || dryRun.isPending),
		preview(body: PseudoAgent, onRefused: (refusal: AgentRefusal) => void) {
			preview({ body, onRefused });
		},
		/** A dry run once the answers stop changing. */
		previewSoon(body: PseudoAgent, onRefused: (refusal: AgentRefusal) => void) {
			clearTimeout(timer.current);
			setPreviewWaiting(true);
			timer.current = setTimeout(
				() => preview({ body, onRefused }),
				PREVIEW_DEBOUNCE_MS,
			);
		},
		async submit(
			body: PseudoAgent,
			onRefused: (refusal: AgentRefusal) => void,
		): Promise<void> {
			cancelWaiting();
			queued.current = null;
			try {
				setCreated(createdAgent(await create.mutateAsync(body)));
			} catch (err) {
				create.reset();
				onRefused(agentRefusal(err));
			}
		},
	};
}
