import { Tags, ToggleLeft, Users } from "lucide-react";
import { useTeams } from "@/api/hooks/teams";
import type { Project } from "@/api/types/project";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { useProjectForm } from "@/projects/useProjectForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface ProjectFormProps {
	project?: Project;
	/** Preselected team when creating from a team page. */
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
		teamIdError,
	} = useProjectForm({ open: true, project, teamId, onSaved });

	const { data: teamsData } = useTeams();
	const teamOptions = (teamsData.items ?? []).map((t) => ({
		value: t.metadata.id ?? "",
		label: displayLabel(t.metadata),
	}));

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
				/>

				<FormSection
					icon={Users}
					title="Team"
					description="The team that owns this project. Spend rolls up to it."
				>
					<div>
						<Select
							value={values.teamId}
							items={teamOptions}
							onValueChange={(v) => form.setFieldValue("teamId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={teamIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a team…" />
							</SelectTrigger>
							<SelectContent>
								{teamOptions.map((t) => (
									<SelectItem key={t.value} value={t.value}>
										{t.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{teamIdError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{teamIdError}
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
					description="Disabling a project stops traffic for the keys inside it."
				>
					<ToggleSwitch
						value={values.enabled}
						onChange={(v) => form.setFieldValue("enabled", v)}
						label="Enabled"
					/>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" variant="cta" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
