import { Tags, ToggleLeft, Users } from "lucide-react";
import type { Project } from "@/api/types/project";
import { useProjectForm } from "@/projects/useProjectForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { OwnerSection } from "@/shared/OwnerSection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface ProjectFormProps {
	project?: Project;
	/** The team when creating from a team page. */
	teamId?: string;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function ProjectForm({
	project,
	teamId,
	onSaved,
	onCancel,
}: ProjectFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		picksTeam,
		placement,
		teamOptions,
		teamIdError,
	} = useProjectForm({ open: true, project, teamId, onSaved });

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
					placeholder="ML Search"
					placement={placement}
				/>

				{picksTeam && (
					<OwnerSection
						icon={Users}
						title="Team"
						description="The team that owns this project. Spend rolls up to it."
						placeholder="Pick a team…"
						options={teamOptions}
						value={values.teamId}
						onChange={(v) => form.setFieldValue("teamId", v)}
						error={teamIdError}
					/>
				)}

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
					description="Disabling a project stops traffic for the keys inside it."
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
