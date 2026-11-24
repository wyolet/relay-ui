import type { AgentAnswers } from "@/agents/agentWrites";
import type { AgentSettings, CreatedAgent } from "@/agents/useAgentWrites";
import type { PseudoAgent, PseudoAgentCreated } from "@/api/hooks/pseudoAgents";
import type { components } from "@/api/types.gen";
import { expiryPatch } from "@/keys/useKeyForm";
import { agentLabels } from "@/lib/agentLabel";
import { required } from "@/lib/required";

type AgentAccess = components["schemas"]["AgentAccess"];

/** The created screen's rows from relay's answer; the policy is named only when the request made it. */
export function createdAgent(answer: PseudoAgentCreated): CreatedAgent {
	const key = required(answer.key, "key");
	const madePolicy = (answer.created ?? []).some(
		(row) => row.kind === "policy",
	);
	return {
		serviceAccountName: answer.serviceAccount.name,
		keyName: key.name,
		plaintext: required(key.plaintext, "key"),
		...(madePolicy && answer.policy ? { policyName: answer.policy.name } : {}),
	};
}

/** Every credential with no models still states the access, so relay never reads an empty spec. */
function access(
	answers: Pick<AgentAnswers, "reach" | "accounts" | "poolIds" | "models">,
): AgentAccess {
	const models =
		answers.models.length > 0 ? { models: [...answers.models] } : {};
	if (answers.reach === "all") return { everyCredential: true, ...models };
	const accountIds = answers.accounts.map((a) => a.id);
	return {
		everyCredential: false,
		...(answers.poolIds.length > 0 ? { poolIds: [...answers.poolIds] } : {}),
		...(accountIds.length > 0 ? { accountIds } : {}),
		...models,
	};
}

/** The `POST /pseudo-agents` body for the form's answers. */
export function pseudoAgentBody(
	settings: Omit<AgentSettings, "scope">,
	answers: Pick<
		AgentAnswers,
		"access" | "reach" | "accounts" | "poolIds" | "models" | "policyId"
	>,
): PseudoAgent {
	return {
		metadata: {
			name: settings.name,
			displayName: settings.displayName,
			description: settings.description,
			labels: agentLabels(),
			owner: { kind: "project", id: settings.projectId },
		},
		spec: {
			...(answers.access === "policy"
				? { policyId: answers.policyId }
				: { access: access(answers) }),
			key: {
				displayName: settings.key.displayName,
				passthroughAllowed: settings.key.passthroughAllowed,
				payloadLoggingEnabled: settings.key.payloadLoggingEnabled,
				...expiryPatch(settings.key.expiresAt),
			},
		},
	};
}
