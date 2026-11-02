import { Building2 } from "lucide-react";
import { useId } from "react";
import { ACCOUNT_SUMMARY } from "@/accounts/accountCopy";
import { useAccountForm } from "@/accounts/useAccountForm";
import type { Account } from "@/api/hooks/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HostSelect } from "@/hosts/HostSelect";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { OwnerSection } from "@/shared/OwnerSection";

interface AccountFormProps {
	account?: Account;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function AccountForm({ account, onSaved, onCancel }: AccountFormProps) {
	const {
		form,
		values,
		errors,
		isEdit,
		slugPreview,
		ownerOptions,
		hostOptions,
	} = useAccountForm({ account, onSaved });
	const orgErrorId = useId();

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
					displayNameError={errors.displayName}
					descriptionError={errors.description}
					autoFocus={!isEdit}
					placeholder="OpenAI build org"
				/>

				<OwnerSection
					options={ownerOptions}
					value={values.owner}
					onChange={(v) => form.setFieldValue("owner", v)}
					error={errors.owner}
				/>

				<FormSection
					icon={Building2}
					title="Provider organization"
					description={ACCOUNT_SUMMARY}
				>
					<div className="flex flex-col gap-4">
						<HostSelect
							value={values.hostId}
							options={hostOptions}
							onChange={(v) => form.setFieldValue("hostId", v)}
							error={errors.hostId}
							disabled={isEdit}
							hint={
								isEdit
									? "Fixed once created: the account's keys are at this host."
									: undefined
							}
						/>
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Organization id
							</div>
							<Input
								type="text"
								value={values.orgId}
								onChange={(e) =>
									form.setFieldValue("orgId", e.currentTarget.value)
								}
								placeholder="org-…"
								className="font-mono w-full max-w-md"
								aria-label="Organization id"
								aria-invalid={errors.orgId ? true : undefined}
								aria-describedby={errors.orgId ? orgErrorId : undefined}
							/>
							{errors.orgId ? (
								<p
									id={orgErrorId}
									className="mt-1.5 text-[11px] text-destructive"
								>
									{errors.orgId}
								</p>
							) : (
								<p className="mt-1.5 text-[11px] text-muted-foreground">
									The provider's organization id, never a person or an email.
									Leave empty until known.
								</p>
							)}
						</div>
					</div>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							variant="cta"
							size="lg"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
