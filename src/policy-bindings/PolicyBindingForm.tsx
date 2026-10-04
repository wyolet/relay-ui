import {
	Boxes,
	ListOrdered,
	ShieldCheck,
	Tags,
	ToggleLeft,
	Users,
} from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import { useProjects } from "@/api/hooks/projects";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import {
	DEFAULT_PRIORITY,
	usePolicyBindingForm,
} from "@/policy-bindings/usePolicyBindingForm";
import { SubjectsEditor } from "@/role-bindings/SubjectsEditor";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
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
		projectIdError,
		policyIdError,
		priorityError,
		subjectsError,
	} = usePolicyBindingForm({ open: true, binding, projectId, onSaved });

	const { data: projectsData } = useProjects();
	const { data: policiesData } = usePolicies();
	const projectOptions = (projectsData.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));
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

				<FormSection
					icon={Boxes}
					title="Project"
					description="A policy binding always lives in one project. Its subjects are the callers inside it."
				>
					<div>
						<Select
							value={values.projectId}
							items={projectOptions}
							onValueChange={(v) => form.setFieldValue("projectId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={projectIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a project…" />
							</SelectTrigger>
							<SelectContent>
								{projectOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{projectIdError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{projectIdError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={ShieldCheck}
					title="Policy"
					description="The policy the matched callers resolve to at request time."
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
					icon={ListOrdered}
					title="Priority"
					description={`Lower wins when several bindings match one caller. Leave blank to take the server's default of ${DEFAULT_PRIORITY}.`}
				>
					<div className="max-w-[10rem]">
						<Input
							type="number"
							min={0}
							max={10000}
							placeholder={String(DEFAULT_PRIORITY)}
							value={values.priority === null ? "" : String(values.priority)}
							onChange={(e) => {
								const n = Number.parseInt(e.currentTarget.value, 10);
								form.setFieldValue("priority", Number.isNaN(n) ? null : n);
							}}
							aria-label="Priority"
							aria-invalid={priorityError ? true : undefined}
						/>
						{priorityError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{priorityError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Users}
					title="Subjects"
					description="Who resolves to this policy. Group subjects name an IdP or local group; users and service accounts are named by id."
				>
					<div>
						<SubjectsEditor
							rows={values.subjects}
							onChange={(next) => form.setFieldValue("subjects", next)}
						/>
						{subjectsError && (
							<p className="mt-2 text-[11px] text-destructive">
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
					description="A disabled binding stops routing its subjects to the policy."
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
