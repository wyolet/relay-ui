import { ShieldCheck, Tags, ToggleLeft, UserRound, Users } from "lucide-react";
import { useId } from "react";
import { usePolicies } from "@/api/hooks/policies";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { SubjectsEditor } from "@/policy-bindings/SubjectsEditor";
import { usePolicyBindingForm } from "@/policy-bindings/usePolicyBindingForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { OwnerSection } from "@/shared/OwnerSection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface PolicyBindingFormProps {
	binding?: PolicyBinding;
	/** Preselected project when creating from a project page. */
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
		ownerOptions,
		ownerError,
		policyIdError,
		subjectOptions,
		subjectName,
		setSubjects,
		subjectsError,
		duplicateSubjectKey,
	} = usePolicyBindingForm({ open: true, binding, projectId, onSaved });
	const subjectsErrorId = useId();

	const { data: policiesData } = usePolicies();
	const policyOptions = (policiesData.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
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
					placeholder="ML Search everyone"
				/>

				<OwnerSection
					icon={UserRound}
					description="The system, a team, a project, or a user. Subjects must sit inside the owner's scope; a user-owned binding names only that user."
					options={ownerOptions}
					value={values.owner}
					onChange={(v) => form.setFieldValue("owner", v)}
					error={ownerError}
				/>

				<FormSection
					icon={ShieldCheck}
					title="Policy"
					description="The policy that governs the subjects."
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
					icon={Users}
					title="Subjects"
					description="Who the policy governs. A subject sits in at most one binding; a user once per owner scope."
				>
					<div>
						<SubjectsEditor
							rows={values.subjects}
							onChange={setSubjects}
							options={subjectOptions}
							subjectName={subjectName}
							invalidKey={duplicateSubjectKey}
							describedBy={subjectsErrorId}
						/>
						{subjectsError && (
							<p
								id={subjectsErrorId}
								className="mt-2 text-[11px] text-destructive"
							>
								{subjectsError}
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
					description="A disabled binding governs none of its subjects."
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
