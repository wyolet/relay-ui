import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";
import { from, unique } from "@/lib/slug";
import {
	describeDuplicate,
	isDuplicateBinding,
} from "@/policy-bindings/accountLookup";

type Owner = components["schemas"]["Owner"];

/** A team, project or service account whose own account a policy is attached to. */
export interface AttachEntity {
	/** Slug and label, to name a binding made for it. */
	slug: string;
	label: string;
	/** Owner of a binding made for it: the team, or the project (a service account's too). */
	owner: Owner;
}

/** One write to apply, in order: a split must free the account before binding it again. */
export type BindingWrite =
	| { op: "create"; body: PolicyBinding }
	| { op: "update"; id: string; body: PolicyBinding }
	| { op: "delete"; id: string };

/** The accounts a binding holds besides this one. */
export function otherAccounts(
	binding: PolicyBinding,
	accountId: string,
): string[] {
	return (binding.spec.accountIds ?? []).filter((id) => id !== accountId);
}

function holdsOnly(binding: PolicyBinding, accountId: string): boolean {
	return otherAccounts(binding, accountId).length === 0;
}

/** Owner of the binding an attach saves into: the account's own single-account binding keeps its owner; anything else lands in the entity's scope. */
export function attachOwner(
	entity: AttachEntity,
	binding: PolicyBinding | undefined,
	accountId: string,
): Owner | undefined {
	return binding && holdsOnly(binding, accountId)
		? binding.metadata.owner
		: entity.owner;
}

/** Every owner an attach writes in: a split edits the shared binding and creates in the entity's scope. */
export function attachWriteOwners(
	entity: AttachEntity,
	binding: PolicyBinding | undefined,
	accountId: string,
): (Owner | undefined)[] {
	if (!binding) return [entity.owner];
	if (holdsOnly(binding, accountId)) return [binding.metadata.owner];
	return [binding.metadata.owner, entity.owner];
}

/** "<entity>-policy", numbered past the names already taken. */
export function newBindingName(
	slug: string,
	taken: ReadonlySet<string>,
): string {
	return unique(from(`${slug}-policy`) || "policy", (n) => taken.has(n));
}

function release(binding: PolicyBinding, accountId: string): BindingWrite {
	return {
		op: "update",
		id: binding.metadata.id ?? "",
		body: {
			metadata: binding.metadata,
			spec: { ...binding.spec, accountIds: otherAccounts(binding, accountId) },
		},
	};
}

/**
 * Writes that bind the account to `policyId`: a new binding when none holds
 * it, a policy swap on its own binding, or out of a shared binding into a new
 * one. Empty when it already has that policy.
 */
export function planAttach(
	entity: AttachEntity,
	accountId: string,
	binding: PolicyBinding | undefined,
	policyId: string,
	takenNames: ReadonlySet<string>,
): BindingWrite[] {
	if (binding?.spec.policyId === policyId) return [];
	if (binding && holdsOnly(binding, accountId)) {
		return [
			{
				op: "update",
				id: binding.metadata.id ?? "",
				body: {
					metadata: binding.metadata,
					spec: { ...binding.spec, policyId },
				},
			},
		];
	}
	const create: BindingWrite = {
		op: "create",
		body: {
			metadata: {
				name: newBindingName(entity.slug, takenNames),
				displayName: `${entity.label} policy`,
				owner: entity.owner,
			},
			spec: { policyId, accountIds: [accountId] },
		},
	};
	return binding ? [release(binding, accountId), create] : [create];
}

/** Writes that unbind the account: delete its own binding, or take it out of a shared one. */
export function planDetach(
	binding: PolicyBinding,
	accountId: string,
): BindingWrite[] {
	return holdsOnly(binding, accountId)
		? [{ op: "delete", id: binding.metadata.id ?? "" }]
		: [release(binding, accountId)];
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
