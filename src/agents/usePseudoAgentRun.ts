import { AGENT_POINTER_FIELDS, type RefusalField } from "@/agents/agentRefusal";
import { createdAgent } from "@/agents/pseudoAgentBody";
import type { CreatedAgent } from "@/agents/useAgentWrites";
import {
	type PseudoAgent,
	type PseudoAgentCreated,
	useCreatePseudoAgent,
	useDryRunPseudoAgent,
} from "@/api/hooks/pseudoAgents";
import { usePseudoRun } from "@/pseudo/usePseudoRun";

/** The agent made in one request; `At` is the form answers a refusal is about. */
export function usePseudoAgentRun<At>() {
	return usePseudoRun<
		PseudoAgent,
		PseudoAgentCreated,
		CreatedAgent,
		RefusalField,
		At
	>({
		kind: "agents",
		dryRun: useDryRunPseudoAgent(),
		create: useCreatePseudoAgent(),
		pointerFields: AGENT_POINTER_FIELDS,
		toCreated: createdAgent,
	});
}
