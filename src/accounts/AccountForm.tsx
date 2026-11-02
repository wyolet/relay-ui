import { Building2, FileText, Tags, UserRound } from "lucide-react";
import { useId } from "react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import {
	PAYLOAD_LOGGING_RULE,
	PROVIDER_ACCOUNT_SUMMARY,
} from "@/accounts/accountCopy";
import {
	PAYLOAD_LOGGING_CHOICES,
	PAYLOAD_LOGGING_LABELS,
} from "@/accounts/payloadLogging";
import { useAccountForm } from "@/accounts/useAccountForm";
import type { Account } from "@/api/hooks/accounts";
import { Input } from "@/components/ui/input";
import { HostSelect } from "@/hosts/HostSelect";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { Segmented } from "@/shared/Segmented";

const PAYLOAD_LOGGING_OPTIONS = PAYLOAD_LOGGING_CHOICES.map((value) => ({
	value,
	label: PAYLOAD_LOGGING_LABELS[value],
}));

const fieldLabelClass =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1";

interface AccountFormProps {
	account?: Account;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function AccountForm({ account, onSaved, onCancel }: AccountFormProps) {
	const {
		form,
		values,
		errors,
		isEdit,
		isProvider,
		payloadLoggingEditable,
		kindLabel,
		holder,
		slugPreview,
		placement,
		hostOptions,
	} = useAccountForm({ account, onSaved });
	const orgErrorId = useId();

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col"
		>
			<div className="divide-y divide-border">
				<IdentitySection
					displayName={values.displayName}
					description={values.description}
					onDisplayNameChange={(v) => form.setFieldValue("displayName", v)}
					onDescriptionChange={(v) => form.setFieldValue("description", v)}
					slugPreview={slugPreview}
					displayNameError={errors.displayName}
					descriptionError={errors.description}
					autoFocus={!isEdit}
					placeholder="OpenAI build org"
					placement={placement}
				/>

				{isProvider ? (
					<FormSection
						icon={Building2}
						title="Provider organization"
						description={PROVIDER_ACCOUNT_SUMMARY}
					>
						<div className="flex flex-col gap-4">
							<HostSelect
								value={values.hostId}
								options={hostOptions}
								onChange={(v) => form.setFieldValue("hostId", v)}
								error={errors.hostId}
								disabled={isEdit}
								hint={
									isEdit
										? "Fixed once created: the account's keys are at this host."
										: undefined
								}
							/>
							<div>
								<div className={fieldLabelClass}>Organization id</div>
								<Input
									type="text"
									value={values.orgId}
									onChange={(e) =>
										form.setFieldValue("orgId", e.currentTarget.value)
									}
									placeholder="org-…"
									className="font-mono w-full max-w-md"
									aria-label="Organization id"
									aria-invalid={errors.orgId ? true : undefined}
									aria-describedby={errors.orgId ? orgErrorId : undefined}
								/>
								{errors.orgId ? (
									<p
										id={orgErrorId}
										className="mt-1.5 text-[11px] text-destructive"
									>
										{errors.orgId}
									</p>
								) : (
									<p className="mt-1.5 text-[11px] text-muted-foreground">
										The provider's organization id, never a person or an email.
										Leave empty until known.
									</p>
								)}
							</div>
						</div>
					</FormSection>
				) : (
					<>
						<FormSection
							icon={UserRound}
							title="Account"
							description="Relay made this account and keeps its kind, holder and owner."
						>
							<dl className="flex flex-col gap-3 text-xs text-foreground">
								<div>
									<dt className={fieldLabelClass}>Kind</dt>
									<dd>{kindLabel}</dd>
								</div>
								{holder && (
									<div>
										<dt className={fieldLabelClass}>Holder</dt>
										<dd>
											<AccountHolderLink holder={holder} />
										</dd>
									</div>
								)}
							</dl>
						</FormSection>

						<FormSection
							icon={FileText}
							title="Payload logging"
							description={PAYLOAD_LOGGING_RULE}
						>
							{payloadLoggingEditable ? (
								<Segmented
									options={PAYLOAD_LOGGING_OPTIONS}
									value={values.payloadLogging}
									onChange={(v) => form.setFieldValue("payloadLogging", v)}
								/>
							) : (
								<p className="text-sm text-foreground">
									{PAYLOAD_LOGGING_LABELS[values.payloadLogging]}
									<span className="ml-2 text-xs text-muted-foreground">
										Set by an admin, or an admin of the account's team or
										project.
									</span>
								</p>
							)}
						</FormSection>
					</>
				)}

				<FormSection
					icon={Tags}
					title="Labels"
					description="Selectors you can filter lists by, e.g. cost-center=1042."
				>
					<LabelsEditor
						pairs={values.labels}
						onChange={(next) => form.setFieldValue("labels", next)}
					/>
				</FormSection>
			</div>

			<form.Subscribe selector={(s) => s.isSubmitting}>
				{(isSubmitting) => (
					<FormFooter
						isEdit={isEdit}
						isSubmitting={isSubmitting}
						onCancel={onCancel}
					/>
				)}
			</form.Subscribe>
		</form>
	);
}
