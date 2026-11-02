import { Tags, ToggleLeft } from "lucide-react";
import type { Team } from "@/api/types/team";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { ToggleSwitch } from "@/shared/ToggleSwitch";
import { useTeamForm } from "@/teams/useTeamForm";

interface TeamFormProps {
	team?: Team;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function TeamForm({ team, onSaved, onCancel }: TeamFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
	} = useTeamForm({ open: true, team, onSaved });

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
					placeholder="Platform Engineering"
				/>

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

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="Disabling a team stops traffic for every project inside it."
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
