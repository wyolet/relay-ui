import { Boxes, ToggleLeft } from "lucide-react";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { useServiceAccountForm } from "@/service-accounts/useServiceAccountForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { OwnerSection } from "@/shared/OwnerSection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface ServiceAccountFormProps {
	serviceAccount?: ServiceAccount;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function ServiceAccountForm({
	serviceAccount,
	onSaved,
	onCancel,
}: ServiceAccountFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		picksProject,
		placement,
		projectOptions,
		projectIdError,
	} = useServiceAccountForm({ open: true, serviceAccount, onSaved });

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
					placeholder="search-indexer"
					placement={placement}
				/>

				{picksProject && (
					<OwnerSection
						icon={Boxes}
						title="Project"
						description="The project that owns this account. Its keys and spend are attributed here."
						placeholder="Pick a project…"
						options={projectOptions}
						value={values.projectId}
						onChange={(v) => form.setFieldValue("projectId", v)}
						error={projectIdError}
					/>
				)}

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="A disabled account's keys stop authenticating."
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
