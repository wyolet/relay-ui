import { Users } from "lucide-react";
import { useId } from "react";
import type { AgentOwnerKind } from "@/agents/agentOwner";
import type { useAddAgentForm } from "@/agents/useAddAgentForm";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { OwnerCards } from "@/shared/OwnerCards";

type AddAgentForm = ReturnType<typeof useAddAgentForm>;

const OWNER_DESCRIPTIONS: Record<AgentOwnerKind, string> = {
	personal: "Yours alone. It uses the accounts you own.",
	team: "Shared by a team, on the team's accounts and spend.",
	project: "Belongs to one project, under its team's limits.",
};

export function AgentStep({ agent }: { agent: AddAgentForm }) {
	const { form, values, errors } = agent;
	const ownerErrorId = useId();
	return (
		<div className="divide-y divide-border">
			<IdentitySection
				displayName={values.displayName}
				description={values.description}
				onDisplayNameChange={(v) => form.setFieldValue("displayName", v)}
				onDescriptionChange={(v) => form.setFieldValue("description", v)}
				slugPreview={agent.slugPreview}
				displayNameError={errors.displayName}
				descriptionError={errors.description}
				autoFocus
				placeholder="Support triage agent"
			/>

			<FormSection
				icon={Users}
				title="Owner"
				description="Who the agent belongs to. Its accounts, policy and spend sit there."
			>
				<OwnerCards
					kinds={agent.ownerKinds.map(({ kind, unavailable }) => ({
						kind,
						description: OWNER_DESCRIPTIONS[kind],
						...(unavailable ? { unavailable } : {}),
					}))}
					pick={values}
					onPick={agent.chooseOwner}
					teamOptions={agent.teamOptions}
					projectOptions={agent.projectOptions}
					teamError={errors.teamId}
					projectError={errors.projectId}
				/>
				<FieldError id={ownerErrorId} message={errors.owner} />
			</FormSection>
		</div>
	);
}
