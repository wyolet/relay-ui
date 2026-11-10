import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	accountListQueryOptions,
	useUsableAccounts,
} from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import {
	usePolicyBindings,
	useSetAccountPolicy,
} from "@/api/hooks/policyBindings";
import {
	type FormPlacement,
	unavailablePicks,
	updatingScope,
} from "@/lib/workContext";
import {
	boundAccountIds,
	TARGET_ACCOUNT_KINDS,
	type TargetFailure,
	targetChanges,
	targetFailureMessage,
	targetOptions,
} from "@/policy-bindings/policyTargets";
import { useAccountLabels } from "@/policy-bindings/useAccountLabels";

/**
 * The accounts a policy applies to, picked on the policy form. A save binds
 * each added account and unbinds each dropped one through
 * `PUT /accounts/{ref}/policy`, one write per account.
 */
export function usePolicyTargets({
	policyId,
	usableBy,
	placement,
}: {
	policyId: string | undefined;
	/** The policy's scope: the accounts a binding there may hold. */
	usableBy: string | undefined;
	placement: FormPlacement | undefined;
}) {
	const bindings = usePolicyBindings();
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });
	const policies = useQuery(policiesListQueryOptions);
	const usable = useUsableAccounts(
		usableBy,
		{ kind: TARGET_ACCOUNT_KINDS },
		"binding",
	);
	const setAccountPolicy = useSetAccountPolicy();
	const { labelOf } = useAccountLabels();
	// Null until the user touches the picker: an untouched picker writes nothing.
	const [picked, setPicked] = useState<string[] | null>(null);

	const bindingItems = bindings.data?.items ?? [];
	const current = policyId ? boundAccountIds(bindingItems, policyId) : [];
	const selected = picked ?? current;
	// An edit diffs against the bindings, so it waits for them.
	const ready = !policyId || bindings.data !== undefined;

	const options = targetOptions({
		usable: usable.items,
		all: accounts.data?.items ?? [],
		current,
		bindings: bindingItems,
		policies: policies.data?.items ?? [],
		policyId,
	});
	const unavailable = unavailablePicks(
		picked === null ? [] : targetChanges(current, picked).add,
		usable,
		placement,
	);

	/** Writes the picker's changes; resolves to the error to show, if any write failed. */
	async function applyTo(savedPolicyId: string): Promise<string | undefined> {
		if (picked === null) return undefined;
		const { add, remove } = targetChanges(current, picked);
		const writes = [
			...add.map((accountId) => ({ accountId, policyId: savedPolicyId })),
			...remove.map((accountId) => ({ accountId, policyId: null })),
		];
		const failures: TargetFailure[] = [];
		// One at a time: two writes into the same binding would race (409).
		for (const write of writes) {
			try {
				await setAccountPolicy.mutateAsync({
					accountRef: write.accountId,
					policyId: write.policyId,
				});
			} catch (err) {
				failures.push({
					accountId: write.accountId,
					message: err instanceof Error ? err.message : "Request failed.",
				});
			}
		}
		setPicked(null);
		return failures.length > 0
			? targetFailureMessage(failures, (id) => labelOf(id).label)
			: undefined;
	}

	return {
		options,
		selected,
		setSelected: setPicked,
		ready,
		unavailable,
		updatingFor: updatingScope(placement, usable),
		applyTo,
	};
}
