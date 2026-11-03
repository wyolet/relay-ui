import type { Account } from "@/api/hooks/accounts";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { Button } from "@/components/ui/button";
import { AttachPolicyDialog } from "@/policy-bindings/AttachPolicyDialog";
import type { AttachEntity } from "@/policy-bindings/attachPolicy";
import { useAccountPolicyActions } from "@/policy-bindings/useAccountPolicyActions";

/** Attach, change or detach the policy on the entity's own account. */
export function AccountPolicyActions({
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
	const actions = useAccountPolicyActions({
		entity,
		account,
		binding,
		policyLabel,
	});
	if (!actions.canAttach && !actions.canDetach) return null;

	return (
		<span className="inline-flex shrink-0 items-center gap-1">
			{actions.canAttach && (
				<Button
					size="sm"
					variant={binding ? "ghost" : "default"}
					onClick={actions.openDialog}
				>
					{binding ? "Change" : "Attach policy"}
				</Button>
			)}
			{actions.canDetach && (
				<Button
					size="sm"
					variant="ghost"
					onClick={() => void actions.detach()}
					disabled={actions.detaching}
				>
					Detach
				</Button>
			)}
			{actions.dialogOpen && (
				<AttachPolicyDialog
					entity={entity}
					account={account}
					binding={binding}
					onClose={actions.closeDialog}
				/>
			)}
		</span>
	);
}
