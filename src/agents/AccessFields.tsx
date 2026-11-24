import { Boxes, KeyRound } from "lucide-react";
import { type ReactNode, useId } from "react";
import type { AgentAccount } from "@/agents/agentAccounts";
import { ModelPicker } from "@/models/ModelPicker";
import type { PickerReach } from "@/models/narrowPickerIndex";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { BoxedCheckList, type CheckOption } from "@/shared/MultiSelect";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

/** The sentences that name who the access is for. */
export interface AccessFieldsText {
	accountsDescription: string;
	everyCredentialHint: string;
	/** After a personal account's host, e.g. "Shared with the agent's owner on create." */
	shareNote: string;
	modelsDescription: string;
	/** The model picker's empty text with every credential in scope. */
	everyCredentialModels: string;
}

function accountOptions(
	accounts: readonly AgentAccount[],
	shareNote: string,
): CheckOption[] {
	return accounts.map((a) => ({
		value: a.id,
		label: a.label,
		hint: a.needsShare
			? `${a.hostLabel}, yours. ${shareNote}`
			: a.sharedBy
				? `${a.hostLabel}, shared by ${a.sharedBy}`
				: a.hostLabel,
	}));
}

/** The provider accounts (or every credential in scope) and the models a caller may use. */
export function AccessFields({
	text,
	everyCredential,
	onEveryCredentialChange,
	accounts,
	accountsLoaded,
	selectedAccountIds,
	onToggleAccount,
	accountsError,
	keptPools,
	keylessPools,
	models,
	onModelsChange,
	reach,
}: {
	text: AccessFieldsText;
	everyCredential: boolean;
	onEveryCredentialChange: (on: boolean) => void;
	accounts: readonly AgentAccount[];
	accountsLoaded: boolean;
	selectedAccountIds: readonly string[];
	onToggleAccount: (id: string) => void;
	accountsError?: string;
	/** Rows for pools that stay linked as they are, above the account list. */
	keptPools?: ReactNode;
	/** A pick list of pools at hosts that take no key, below the account list. */
	keylessPools?: ReactNode;
	models: string[];
	onModelsChange: (models: string[]) => void;
	reach: PickerReach | undefined;
}) {
	const accountsErrorId = useId();
	return (
		<>
			<FormSection
				icon={KeyRound}
				title="Accounts"
				description={text.accountsDescription}
			>
				<div className="flex flex-col gap-3">
					<ToggleSwitch
						value={everyCredential}
						onChange={onEveryCredentialChange}
						label="Use every credential in scope"
						hint={text.everyCredentialHint}
					/>
					{!everyCredential && (
						<div className="flex flex-col gap-3">
							{keptPools}
							<div>
								<fieldset
									aria-label="Accounts"
									aria-describedby={accountsError ? accountsErrorId : undefined}
									className="min-w-0"
								>
									<BoxedCheckList
										options={accountOptions(accounts, text.shareNote)}
										selected={selectedAccountIds}
										onToggle={onToggleAccount}
										emptyLabel={accountsLoaded ? "accounts" : "accounts yet"}
									/>
								</fieldset>
								<FieldError id={accountsErrorId} message={accountsError} />
							</div>
							{keylessPools}
						</div>
					)}
				</div>
			</FormSection>

			<FormSection
				icon={Boxes}
				title="Models"
				description={text.modelsDescription}
			>
				{reach?.models.size === 0 && models.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						Pick an account to see the models it serves.
					</p>
				) : (
					<ModelPicker
						value={models}
						onChange={onModelsChange}
						emptyText={
							everyCredential
								? text.everyCredentialModels
								: "All models these accounts serve. Pick providers or models to narrow it."
						}
						reach={reach}
					/>
				)}
			</FormSection>
		</>
	);
}
