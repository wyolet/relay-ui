import { Boxes, KeyRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { AgentAccess } from "@/agents/agentWrites";
import type { useAddAgentForm } from "@/agents/useAddAgentForm";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ModelPicker } from "@/models/ModelPicker";
import { FormSection } from "@/shared/FormSection";
import { BoxedCheckList, type CheckOption } from "@/shared/MultiSelect";
import { Segmented } from "@/shared/Segmented";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

type AddAgentForm = ReturnType<typeof useAddAgentForm>;

const ACCESS_OPTIONS: { value: AgentAccess; label: string }[] = [
	{ value: "choose", label: "Choose accounts and models" },
	{ value: "policy", label: "Use a policy" },
];

function accountHint(account: AgentAccount): string {
	if (account.needsShare) {
		return `${account.hostLabel}, yours. Shared with the agent's owner on create.`;
	}
	return account.sharedBy
		? `${account.hostLabel}, shared by ${account.sharedBy}`
		: account.hostLabel;
}

function accountOptions(accounts: readonly AgentAccount[]): CheckOption[] {
	return accounts.map((a) => ({
		value: a.id,
		label: a.label,
		hint: accountHint(a),
	}));
}

export function AccessStep({ agent }: { agent: AddAgentForm }) {
	const { form, values, errors } = agent;
	const everyCredential = values.reach === "all";
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
					{errors.policyId && (
						<p className="mt-1.5 text-[11px] text-destructive">
							{errors.policyId}
						</p>
					)}
				</FormSection>
			) : (
				<>
					<FormSection
						icon={KeyRound}
						title="Accounts"
						description="The provider accounts whose keys the agent's requests may use."
					>
						<div className="flex flex-col gap-3">
							<ToggleSwitch
								value={everyCredential}
								onChange={(on) =>
									form.setFieldValue("reach", on ? "all" : "accounts")
								}
								label="Use every credential in scope"
								hint="Requests use the keys the agent's owner holds, then the system's."
							/>
							{!everyCredential && (
								<div>
									<BoxedCheckList
										options={accountOptions(agent.accounts)}
										selected={values.accountIds}
										onToggle={agent.toggleAccount}
										emptyLabel={
											agent.accountsLoaded ? "accounts" : "accounts yet"
										}
									/>
									{errors.accountIds && (
										<p className="mt-1.5 text-[11px] text-destructive">
											{errors.accountIds}
										</p>
									)}
								</div>
							)}
						</div>
					</FormSection>

					<FormSection
						icon={Boxes}
						title="Models"
						description="Providers or single models the agent may call. Leave it empty to allow everything its accounts serve."
					>
						{agent.reach?.models.size === 0 && values.models.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								Pick an account to see the models it serves.
							</p>
						) : (
							<ModelPicker
								value={values.models}
								onChange={(next) => form.setFieldValue("models", next)}
								emptyText={
									everyCredential
										? "All models the owner's credentials serve. Pick providers or models to narrow it."
										: "All models these accounts serve. Pick providers or models to narrow it."
								}
								reach={agent.reach}
							/>
						)}
					</FormSection>
				</>
			)}
		</div>
	);
}
