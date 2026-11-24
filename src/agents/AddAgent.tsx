import { AccessStep } from "@/agents/AccessStep";
import { AgentStep } from "@/agents/AgentStep";
import { CreatedStep } from "@/agents/CreatedStep";
import { KeyStep } from "@/agents/KeyStep";
import {
	type AddAgentValues,
	AGENT_FORM_STEPS,
	type AgentFormStep,
	useAddAgentForm,
} from "@/agents/useAddAgentForm";
import { RefusedIssues } from "@/shared/RefusedIssues";
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

export function AddAgent({
	initial,
	onCancel,
}: {
	/** Where the form starts instead of empty, e.g. copied from another agent. */
	initial?: Partial<AddAgentValues>;
	onCancel: () => void;
}) {
	const agent = useAddAgentForm(initial);
	const { step, created } = agent;
	return (
		<StepForm
			steps={STEPS}
			form={agent}
			finishLabel="Create agent"
			runTitle="Creating the agent"
			result={
				created && (
					<CreatedStep created={created} models={agent.snippetModels} />
				)
			}
			onCancel={onCancel}
		>
			<RefusedIssues messages={agent.stepIssues} />
			{step === "agent" && <AgentStep agent={agent} />}
			{step === "access" && <AccessStep agent={agent} />}
			{step === "key" && <KeyStep agent={agent} />}
		</StepForm>
	);
}
