import { AccessStep } from "@/agents/AccessStep";
import { AgentStep } from "@/agents/AgentStep";
import { CreatedStep } from "@/agents/CreatedStep";
import { KeyStep } from "@/agents/KeyStep";
import {
	AGENT_FORM_STEPS,
	type AgentFormStep,
	useAddAgentForm,
} from "@/agents/useAddAgentForm";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/shared/FormFooter";
import { Stepper } from "@/shared/Stepper";
import { WriteRun } from "@/shared/WriteRun";

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
	const { step, stepIndex, lastStep, writes } = agent;

	if (writes.phase !== "idle") {
		return (
			<div className="flex flex-col gap-8">
				<Stepper steps={STEPS} current={AGENT_FORM_STEPS.length} />
				{writes.created ? (
					<CreatedStep created={writes.created} models={agent.snippetModels} />
				) : (
					<WriteRun
						title="Creating the agent"
						phase={writes.phase}
						items={writes.steps.map(({ write, status }) => ({
							id: write.id,
							label: write.label,
							status,
						}))}
						error={writes.error}
						onRetry={() => void writes.retry()}
					/>
				)}
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				agent.next();
			}}
			className="flex flex-col gap-8"
		>
			<Stepper steps={STEPS} current={stepIndex} />

			{step === "agent" && <AgentStep agent={agent} />}
			{step === "access" && <AccessStep agent={agent} />}
			{step === "key" && <KeyStep agent={agent} />}

			<StickyFooter>
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				{stepIndex > 0 && (
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={agent.back}
					>
						Back
					</Button>
				)}
				<Button type="submit" variant="cta" size="lg">
					{lastStep ? "Create agent" : "Next"}
				</Button>
			</StickyFooter>
		</form>
	);
}
