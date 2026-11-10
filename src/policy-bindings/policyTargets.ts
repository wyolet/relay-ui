import { accountLabel } from "@/accounts/accountView";
import type { Account, AccountSpec } from "@/api/hooks/accounts";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { FilterOption } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import { accountBinding } from "@/policy-bindings/accountLookup";

/** Accounts requests come from; provider accounts take tier policies, not these. */
export const TARGET_ACCOUNT_KINDS: AccountSpec["kind"][] = [
	"team",
	"project",
	"service",
	"personal",
	"member",
];

/** The accounts the policy's bindings hold. */
export function boundAccountIds(
	bindings: readonly PolicyBinding[],
	policyId: string,
): string[] {
	return bindings
		.filter((b) => b.spec.policyId === policyId)
		.flatMap((b) => b.spec.accountIds ?? []);
}

/** The accounts a save binds to the policy, and the ones it unbinds. */
export function targetChanges(
	current: readonly string[],
	picked: readonly string[],
): { add: string[]; remove: string[] } {
	return {
		add: picked.filter((id) => !current.includes(id)),
		remove: current.filter((id) => !picked.includes(id)),
	};
}

/**
 * The picker's rows: what the policy's scope may bind, plus what it already
 * holds. A row bound to another policy names it, since saving moves it here.
 */
export function targetOptions({
	usable,
	all,
	current,
	bindings,
	policies,
	policyId,
}: {
	usable: readonly Account[];
	all: readonly Account[];
	current: readonly string[];
	bindings: readonly PolicyBinding[];
	policies: readonly Policy[];
	policyId: string | undefined;
}): FilterOption[] {
	const usableIds = new Set(usable.map((a) => a.metadata.id));
	const rows = [
		...usable,
		...all.filter(
			(a) =>
				!usableIds.has(a.metadata.id) && current.includes(a.metadata.id ?? ""),
		),
	];
	return rows.flatMap((a) => {
		const id = a.metadata.id;
		if (!id) return [];
		const label = accountLabel(a);
		const otherPolicyId = accountBinding(bindings, id)?.spec.policyId;
		if (!otherPolicyId || otherPolicyId === policyId) {
			return [{ value: id, label }];
		}
		const other = policies.find((p) => p.metadata.id === otherPolicyId);
		const otherName = other ? displayLabel(other.metadata) : "another policy";
		return [{ value: id, label: `${label} · now uses ${otherName}` }];
	});
}

export interface TargetFailure {
	accountId: string;
	message: string;
}

/** The toast for a save whose policy landed but some accounts didn't follow. */
export function targetFailureMessage(
	failures: readonly TargetFailure[],
	labelOf: (accountId: string) => string,
): string {
	const lines = failures.map((f) => `${labelOf(f.accountId)}: ${f.message}`);
	return `Policy saved, but ${failures.length === 1 ? "one account wasn't" : `${failures.length} accounts weren't`} updated. ${lines.join("; ")}`;
}
