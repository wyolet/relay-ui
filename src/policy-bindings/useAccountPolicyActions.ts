import { useState } from "react";
import type { Account } from "@/api/hooks/accounts";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useScopeCaller } from "@/hooks/useScopeCaller";
import { displayLabel } from "@/lib/displayLabel";
import { administersOwner } from "@/lib/ownership";
import {
	type AttachEntity,
	attachWriteOwners,
	detachDescription,
	planDetach,
} from "@/policy-bindings/attachPolicy";
import { useApplyBindingWrites } from "@/policy-bindings/useApplyBindingWrites";
import { confirm } from "@/shared/ConfirmDialog";
import { toast } from "@/shared/Toast";

/**
 * Who may attach, change or detach the account's policy, and the detach flow.
 * The buttons follow the caller's admin scopes; the server has the last word.
 */
export function useAccountPolicyActions({
	entity,
	account,
	binding,
	policyLabel,
}: {
	entity: AttachEntity;
	account: Account;
	binding: PolicyBinding | undefined;
	policyLabel: string;
}) {
	const caller = useScopeCaller();
	const apply = useApplyBindingWrites();
	const toastSaveError = useSaveErrorToast();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [detaching, setDetaching] = useState(false);
	const accountId = account.metadata.id ?? "";

	const canAttach = attachWriteOwners(entity, binding, accountId).every((o) =>
		administersOwner(o, caller),
	);
	const canDetach =
		binding !== undefined && administersOwner(binding.metadata.owner, caller);

	async function detach() {
		if (!binding) return;
		const ok = await confirm({
			title: `Detach "${policyLabel}" from ${entity.label}?`,
			description: detachDescription(
				binding,
				displayLabel(binding.metadata),
				accountId,
			),
			confirmLabel: "Detach",
			danger: true,
		});
		if (!ok) return;
		setDetaching(true);
		try {
			await apply(planDetach(binding, accountId));
			toast("success", `Detached "${policyLabel}" from ${entity.label}.`);
		} catch (err) {
			toastSaveError(err, "Failed to detach the policy.");
		} finally {
			setDetaching(false);
		}
	}

	return {
		canAttach,
		canDetach,
		dialogOpen,
		openDialog: () => setDialogOpen(true),
		closeDialog: () => setDialogOpen(false),
		detach,
		detaching,
	};
}
