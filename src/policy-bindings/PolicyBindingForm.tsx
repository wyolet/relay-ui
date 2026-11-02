import { Building2, ShieldCheck, Tags, ToggleLeft } from "lucide-react";
import { useId } from "react";
import type { PolicyBinding } from "@/api/types/policyBinding";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AccountsPicker } from "@/policy-bindings/AccountsPicker";
import { usePolicyBindingForm } from "@/policy-bindings/usePolicyBindingForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface PolicyBindingFormProps {
	binding?: PolicyBinding;
	/** The owner project when creating from a project page. */
	projectId?: string;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function PolicyBindingForm({
	binding,
	projectId,
	onSaved,
	onCancel,
}: PolicyBindingFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		placement,
		policyIdError,
		policyOptions,
		accountOptions,
		setAccountIds,
		accountIdsError,
		duplicateAccountId,
	} = usePolicyBindingForm({ open: true, binding, projectId, onSaved });
	const accountIdsErrorId = useId();

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
					displayNameError={displayNameError}
					descriptionError={descriptionError}
					autoFocus={!isEdit}
					placeholder="ML Search everyone"
					placement={placement}
				/>

				<FormSection
					icon={ShieldCheck}
					title="Policy"
					description="The policy that governs the accounts."
				>
					<div>
						<Select
							value={values.policyId}
							items={policyOptions}
							onValueChange={(v) => form.setFieldValue("policyId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={policyIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a policy…" />
							</SelectTrigger>
							<SelectContent>
								{policyOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{policyIdError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{policyIdError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Building2}
					title="Accounts"
					description="The accounts the policy governs. An account sits in at most one binding."
				>
					<div>
						<AccountsPicker
							options={accountOptions}
							selected={values.accountIds}
							onChange={setAccountIds}
							invalidId={duplicateAccountId}
							describedBy={accountIdsError ? accountIdsErrorId : undefined}
						/>
						{accountIdsError && (
							<p
								id={accountIdsErrorId}
								className="mt-2 text-[11px] text-destructive"
							>
								{accountIdsError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Tags}
					title="Labels"
					description="Selectors you can filter lists by, e.g. env=prod."
				>
					<LabelsEditor
						pairs={values.labels}
						onChange={(next) => form.setFieldValue("labels", next)}
					/>
				</FormSection>

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="A disabled binding governs none of its accounts."
				>
					<ToggleSwitch
						value={values.enabled}
						onChange={(v) => form.setFieldValue("enabled", v)}
						label="Enabled"
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
