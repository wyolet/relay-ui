import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";
import {
	describeDuplicate,
	isDuplicateBinding,
} from "@/policy-bindings/accountLookup";

type Owner = components["schemas"]["Owner"];

/** A team, project or service account whose own account a policy is attached to. */
export interface AttachEntity {
	label: string;
	/** Owner of a binding made for it: the team, or the project (a service account's too). */
	owner: Owner;
}

/** The accounts a binding holds besides this one. */
export function otherAccounts(
	binding: PolicyBinding,
	accountId: string,
): string[] {
	return (binding.spec.accountIds ?? []).filter((id) => id !== accountId);
}

/** Owner of the binding an attach makes: relay always gives the account a binding of its own in the entity's scope. */
export function attachOwner(entity: AttachEntity): Owner | undefined {
	return entity.owner;
}

/** Every owner an attach writes in: the binding it leaves, and the entity's scope it lands in. */
export function attachWriteOwners(
	entity: AttachEntity,
	binding: PolicyBinding | undefined,
): (Owner | undefined)[] {
	return binding ? [binding.metadata.owner, entity.owner] : [entity.owner];
}

/**
 * The refusals the dialog shows by its picker: another binding holds the
 * account, or the owner may not bind it or use the policy. Undefined leaves
 * the error to a toast.
 */
export function attachErrorMessage(
	err: unknown,
	accountName: (accountId: string) => string | undefined,
): string | undefined {
	if (isDuplicateBinding(err))
		return describeDuplicate(err.body.message, accountName).message;
	if (err instanceof ApiError && err.status === 400) return err.body.message;
	return undefined;
}

function otherCount(n: number): string {
	return n === 1 ? "1 other account" : `${n} other accounts`;
}

/** The change dialog's note when the account sits in a shared binding. */
export function sharedBindingNote(
	binding: PolicyBinding,
	bindingLabel: string,
	accountId: string,
): string | undefined {
	const others = otherAccounts(binding, accountId).length;
	if (others === 0) return undefined;
	return `Policy binding "${bindingLabel}" is shared with ${otherCount(others)}. Saving moves this account to a binding of its own; the others keep their policy.`;
}

/** What detaching does, for the confirm. */
export function detachDescription(
	binding: PolicyBinding,
	bindingLabel: string,
	accountId: string,
): string {
	const others = otherAccounts(binding, accountId).length;
	if (others === 0) {
		return `Deletes policy binding "${bindingLabel}", which holds only this account. Its requests then follow only the policies above it.`;
	}
	return `Takes this account out of policy binding "${bindingLabel}". The binding is shared with ${otherCount(others)} and keeps its policy for them.`;
}
