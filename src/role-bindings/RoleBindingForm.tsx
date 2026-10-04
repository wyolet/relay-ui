import { Globe, ShieldCheck, Tags, ToggleLeft, Users } from "lucide-react";
import { useProjects } from "@/api/hooks/projects";
import { useRoles } from "@/api/hooks/roles";
import { useTeams } from "@/api/hooks/teams";
import type { RoleBinding } from "@/api/types/roleBinding";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { SubjectsEditor } from "@/role-bindings/SubjectsEditor";
import {
	type ScopeKind,
	useRoleBindingForm,
} from "@/role-bindings/useRoleBindingForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { LabelsEditor } from "@/shared/LabelsEditor";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

const SCOPE_KINDS: { value: ScopeKind; label: string }[] = [
	{ value: "system", label: "Global (system)" },
	{ value: "team", label: "Team" },
	{ value: "project", label: "Project" },
];

interface RoleBindingFormProps {
	binding?: RoleBinding;
	/** Preselected scope when creating from a team or project page. */
	scopeKind?: ScopeKind;
	scopeId?: string;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function RoleBindingForm({
	binding,
	scopeKind,
	scopeId,
	onSaved,
	onCancel,
}: RoleBindingFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		roleIdError,
		scopeIdError,
		subjectsError,
	} = useRoleBindingForm({ open: true, binding, scopeKind, scopeId, onSaved });

	const { data: rolesData } = useRoles();
	const { data: teamsData } = useTeams();
	const { data: projectsData } = useProjects();

	const roleOptions = (rolesData.items ?? []).map((r) => ({
		value: r.metadata.id ?? "",
		label: displayLabel(r.metadata),
	}));
	const targets =
		values.scopeKind === "team"
			? (teamsData.items ?? [])
			: (projectsData.items ?? []);
	const targetOptions = targets.map((t) => ({
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
					placeholder="Platform admins"
				/>

				<FormSection
					icon={ShieldCheck}
					title="Role"
					description="The rule set this binding grants at its scope."
				>
					<div>
						<Select
							value={values.roleId}
							items={roleOptions}
							onValueChange={(v) => form.setFieldValue("roleId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={roleIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a role…" />
							</SelectTrigger>
							<SelectContent>
								{roleOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{roleIdError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{roleIdError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Globe}
					title="Scope"
					description="The binding applies to every resource whose scope chain contains this one. Global grants everywhere."
				>
					<div className="flex flex-col gap-2 max-w-md">
						<Select
							value={values.scopeKind}
							items={SCOPE_KINDS}
							onValueChange={(v) => {
								form.setFieldValue("scopeKind", (v as ScopeKind) ?? "system");
								form.setFieldValue("scopeId", "");
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SCOPE_KINDS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{values.scopeKind !== "system" && (
							<div>
								<Select
									value={values.scopeId}
									items={targetOptions}
									onValueChange={(v) => form.setFieldValue("scopeId", v ?? "")}
								>
									<SelectTrigger
										className="w-full"
										aria-invalid={scopeIdError ? true : undefined}
									>
										<SelectValue placeholder={`Pick a ${values.scopeKind}…`} />
									</SelectTrigger>
									<SelectContent>
										{targetOptions.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{scopeIdError && (
									<p className="mt-1.5 text-[11px] text-destructive">
										{scopeIdError}
									</p>
								)}
							</div>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Users}
					title="Subjects"
					description="Who the role is granted to. Group subjects name an IdP or local group; users and service accounts are named by id."
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
					description="A disabled binding grants nothing."
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
