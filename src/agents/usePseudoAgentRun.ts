import { useState } from "react";
import { type AgentRefusal, agentRefusal } from "@/agents/agentRefusal";
import { createdAgent } from "@/agents/pseudoAgentBody";
import type { CreatedAgent } from "@/agents/useAgentWrites";
import {
	type PseudoAgent,
	useCreatePseudoAgent,
	useDryRunPseudoAgent,
} from "@/api/hooks/pseudoAgents";
import type { StepFormWrites } from "@/shared/StepForm";

/**
 * The agent made in one request: a dry run lists what it would make, the
 * submit makes it all or nothing, so there is no per-write progress to retry.
 */
export function usePseudoAgentRun() {
	const create = useCreatePseudoAgent();
	const dryRun = useDryRunPseudoAgent();
	const [created, setCreated] = useState<CreatedAgent | null>(null);

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

	return {
		run,
		created,
		previewRows: dryRun.data?.created ?? [],
		previewPending: dryRun.isPending,
		preview(body: PseudoAgent, onRefused: (refusal: AgentRefusal) => void) {
			dryRun.mutate(body, { onError: (err) => onRefused(agentRefusal(err)) });
		},
		async submit(
			body: PseudoAgent,
			onRefused: (refusal: AgentRefusal) => void,
		): Promise<void> {
			try {
				setCreated(createdAgent(await create.mutateAsync(body)));
			} catch (err) {
				create.reset();
				onRefused(agentRefusal(err));
			}
		},
	};
}
