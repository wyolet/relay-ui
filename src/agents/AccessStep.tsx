import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useId } from "react";
import { AccessFields, type AccessFieldsText } from "@/agents/AccessFields";
import type { AgentAccess } from "@/agents/agentWrites";
import type { useAddAgentForm } from "@/agents/useAddAgentForm";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { Segmented } from "@/shared/Segmented";

type AddAgentForm = ReturnType<typeof useAddAgentForm>;

const ACCESS_OPTIONS: { value: AgentAccess; label: string }[] = [
	{ value: "choose", label: "Choose accounts and models" },
	{ value: "policy", label: "Use a policy" },
];

const AGENT_ACCESS_TEXT: AccessFieldsText = {
	accountsDescription:
		"The provider accounts whose keys the agent's requests may use.",
	everyCredentialHint:
		"Requests use the keys the agent's owner holds, then the system's.",
	shareNote: "Shared with the agent's owner on create.",
	modelsDescription:
		"Providers or single models the agent may call. Leave it empty to allow everything its accounts serve.",
	everyCredentialModels:
		"All models the owner's credentials serve. Pick providers or models to narrow it.",
};

export function AccessStep({ agent }: { agent: AddAgentForm }) {
	const { form, values, errors } = agent;
	const policyErrorId = useId();
	return (
		<div className="divide-y divide-border">
			<FormSection
				icon={SlidersHorizontal}
				title="Access"
				description="Pick what the agent may use yourself, or give it a policy that already says so."
			>
				<Segmented
					options={ACCESS_OPTIONS}
					value={values.access}
					onChange={(access) => form.setFieldValue("access", access)}
				/>
			</FormSection>

			{values.access === "policy" ? (
				<FormSection
					icon={ShieldCheck}
					title="Policy"
					description="The agent gets this policy's accounts, models and limits. Provider presets list last."
				>
					<Select
						value={values.policyId}
						items={agent.policyOptions.map((o) => ({
							value: o.value,
							label: o.label,
						}))}
						onValueChange={(v) => form.setFieldValue("policyId", v ?? "")}
					>
						<SelectTrigger
							className="w-full max-w-md"
							aria-label="Policy"
							aria-invalid={errors.policyId ? true : undefined}
							aria-describedby={errors.policyId ? policyErrorId : undefined}
						>
							<SelectValue placeholder="Pick a policy…" />
						</SelectTrigger>
						<SelectContent>
							{agent.policyOptions.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									<span className="flex w-full items-center gap-2">
										<span className="truncate">{o.label}</span>
										{o.tierPreset && (
											<span className="ml-auto pr-5 pl-3 text-[11px] text-muted-foreground">
												Preset
											</span>
										)}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FieldError id={policyErrorId} message={errors.policyId} />
				</FormSection>
			) : (
				<AccessFields
					text={AGENT_ACCESS_TEXT}
					everyCredential={values.reach === "all"}
					onEveryCredentialChange={(on) =>
						form.setFieldValue("reach", on ? "all" : "accounts")
					}
					accounts={agent.accounts}
					accountsLoaded={agent.accountsLoaded}
					selectedAccountIds={values.accountIds}
					onToggleAccount={agent.toggleAccount}
					accountsError={errors.accountIds}
					models={values.models}
					onModelsChange={(next) => form.setFieldValue("models", next)}
					reach={agent.reach}
				/>
			)}
		</div>
	);
}
