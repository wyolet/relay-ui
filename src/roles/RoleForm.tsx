import { ShieldCheck, Tags, ToggleLeft } from "lucide-react";
import type { Role } from "@/api/types/role";
import { Button } from "@/components/ui/button";
import { RulesEditor } from "@/roles/RulesEditor";
import { useRoleForm } from "@/roles/useRoleForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface RoleFormProps {
	role?: Role;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function RoleForm({ role, onSaved, onCancel }: RoleFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		rulesError,
	} = useRoleForm({ open: true, role, onSaved });

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
					placeholder="Release Manager"
				/>

				<FormSection
					icon={ShieldCheck}
					title="Rules"
					description="Each rule grants every verb it names on every kind it names. A role carries no scope — the binding supplies it."
				>
					<div>
						<RulesEditor
							rows={values.rules}
							onChange={(next) => form.setFieldValue("rules", next)}
						/>
						{rulesError && (
							<p className="mt-2 text-[11px] text-destructive">{rulesError}</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Tags}
					title="Labels"
					description="Selectors you can filter lists by, e.g. tier=platform."
				>
					<LabelsEditor
						pairs={values.labels}
						onChange={(next) => form.setFieldValue("labels", next)}
					/>
				</FormSection>

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="A disabled role grants nothing, whatever binds it."
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
