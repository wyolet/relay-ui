import { PROVIDER_ACCOUNT_SUMMARY } from "@/accounts/accountCopy";
import { ProviderAccountFields } from "@/accounts/ProviderAccountFields";
import { useAccountForm } from "@/accounts/useAccountForm";
import type { Account } from "@/api/hooks/accounts";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { IdentityFields } from "@/shared/IdentitySection";

/** Creates a provider account from inside another form and hands it back; closes itself after. */
export function NewAccountDialog({
	presetHostId,
	onClose,
	onCreated,
}: {
	presetHostId?: string;
	onClose: () => void;
	onCreated: (account: Account) => void;
}) {
	const {
		form,
		values,
		errors,
		isSubmitting,
		slugPreview,
		placement,
		placementError,
		hostOptions,
	} = useAccountForm({
		presetHostId,
		onSaved: (created) => {
			onCreated(created);
			onClose();
		},
	});

	return (
		<Dialog open onOpenChange={(next) => !next && !isSubmitting && onClose()}>
			<DialogContent className="sm:max-w-md">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle>New provider account</DialogTitle>
						<DialogDescription>{PROVIDER_ACCOUNT_SUMMARY}</DialogDescription>
					</DialogHeader>

					<IdentityFields
						displayName={values.displayName}
						description={values.description}
						onDisplayNameChange={(v) => form.setFieldValue("displayName", v)}
						onDescriptionChange={(v) => form.setFieldValue("description", v)}
						slugPreview={slugPreview}
						displayNameError={errors.displayName}
						descriptionError={errors.description}
						autoFocus
						placeholder="OpenAI build org"
						placement={placement}
						placementError={placementError}
					/>
					<ProviderAccountFields
						hostId={values.hostId}
						hostOptions={hostOptions}
						onHostChange={(v) => form.setFieldValue("hostId", v)}
						hostError={errors.hostId}
						hostLocked={false}
						orgId={values.orgId}
						onOrgIdChange={(v) => form.setFieldValue("orgId", v)}
						orgIdError={errors.orgId}
					/>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" variant="cta" disabled={isSubmitting}>
							{isSubmitting ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
