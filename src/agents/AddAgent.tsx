import { AccessStep } from "@/agents/AccessStep";
import { AgentStep } from "@/agents/AgentStep";
import { CreatedStep } from "@/agents/CreatedStep";
import { KeyStep } from "@/agents/KeyStep";
import {
	AGENT_FORM_STEPS,
	type AgentFormStep,
	useAddAgentForm,
} from "@/agents/useAddAgentForm";
import { StepForm } from "@/shared/StepForm";

const STEP_LABELS: Record<AgentFormStep, string> = {
	agent: "Agent",
	access: "Access",
	key: "Key",
};

const STEPS = [
	...AGENT_FORM_STEPS.map((id) => ({ id, label: STEP_LABELS[id] })),
	{ id: "created", label: "Connect" },
];

export function AddAgent({ onCancel }: { onCancel: () => void }) {
	const agent = useAddAgentForm();
	const { step, writes } = agent;
	return (
		<StepForm
			steps={STEPS}
			form={agent}
			finishLabel="Create agent"
			runTitle="Creating the agent"
			result={
				writes.created && (
					<CreatedStep created={writes.created} models={agent.snippetModels} />
				)
			}
			onCancel={onCancel}
		>
			{step === "agent" && <AgentStep agent={agent} />}
			{step === "access" && <AccessStep agent={agent} />}
			{step === "key" && <KeyStep agent={agent} />}
		</StepForm>
	);
}
