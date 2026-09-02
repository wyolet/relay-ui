import { Boxes, ShieldCheck, ToggleLeft } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import { useProjects } from "@/api/hooks/projects";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { useServiceAccountForm } from "@/service-accounts/useServiceAccountForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
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
		projectIdError,
	} = useServiceAccountForm({ open: true, serviceAccount, onSaved });

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
					placeholder="search-indexer"
				/>

				<FormSection
					icon={Boxes}
					title="Project"
					description="The project that owns this account. Its keys and spend are attributed here."
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
								{projectOptions.map((p) => (
									<SelectItem key={p.value} value={p.value}>
										{p.label}
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
					description="Optional. A key of this account with no policy of its own resolves to this one."
				>
					<Select
						value={values.policyId}
						items={policyOptions}
						onValueChange={(v) => form.setFieldValue("policyId", v ?? "")}
					>
						<SelectTrigger className="w-full max-w-md">
							<SelectValue placeholder="No policy override" />
						</SelectTrigger>
						<SelectContent>
							{policyOptions.map((p) => (
								<SelectItem key={p.value} value={p.value}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormSection>

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
