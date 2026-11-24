import type { Policy, PolicySpec } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";

type Owner = components["schemas"]["Owner"];

/**
 * How one account gets a policy a form may change for it alone. An account
 * takes one binding, so a form never adds a second policy:
 *   create: the account has none;
 *   update: its policy is the scope's own and bound to no other account;
 *   copy:   its policy is someone else's (a preset) or other accounts share it.
 */
export type OwnPolicyCase =
	| { kind: "create" }
	| { kind: "update"; policy: Policy }
	| {
			kind: "copy";
			policy: Policy;
			otherAccounts: number;
			ownedElsewhere: boolean;
	  };

function sameOwner(a: Owner | undefined, b: Owner | undefined): boolean {
	return (a?.kind ?? "") === (b?.kind ?? "") && (a?.id ?? "") === (b?.id ?? "");
}

export function ownPolicyCase(
	accountId: string,
	bindings: readonly PolicyBinding[],
	policies: readonly Policy[],
	scopeOwner: Owner | undefined,
): OwnPolicyCase {
	const holding = bindings.find((b) =>
		(b.spec.accountIds ?? []).includes(accountId),
	);
	const policy =
		holding && policies.find((p) => p.metadata.id === holding.spec.policyId);
	if (!policy) return { kind: "create" };
	const bound = new Set(
		bindings.flatMap((b) =>
			b.spec.policyId === policy.metadata.id ? (b.spec.accountIds ?? []) : [],
		),
	);
	bound.delete(accountId);
	const ownedElsewhere = !sameOwner(policy.metadata.owner, scopeOwner);
	if (bound.size === 0 && !ownedElsewhere) return { kind: "update", policy };
	return { kind: "copy", policy, otherAccounts: bound.size, ownedElsewhere };
}

/** One request of the sequence that leaves the account with its changed policy. */
export type OwnPolicyWrite = { id: string; label: string } & (
	| { kind: "policyCreate" }
	| { kind: "policyCopy"; sourceId: string }
	| { kind: "policyUpdate" }
	| { kind: "policyBind" }
);

/** The requests for a case, in order; `target` reads in the labels, e.g. "the team". */
export function ownPolicyWrites(
	policyCase: OwnPolicyCase,
	target: string,
): OwnPolicyWrite[] {
	const bind: OwnPolicyWrite = {
		kind: "policyBind",
		id: "policy-bind",
		label: `Apply the policy to ${target}`,
	};
	if (policyCase.kind === "create") {
		return [
			{ kind: "policyCreate", id: "policy-create", label: "Create the policy" },
			bind,
		];
	}
	const update: OwnPolicyWrite = {
		kind: "policyUpdate",
		id: "policy-update",
		label: "Update the policy",
	};
	if (policyCase.kind === "update") return [update];
	return [
		{
			kind: "policyCopy",
			id: "policy-copy",
			label: `Copy the policy for ${target}`,
			sourceId: policyCase.policy.metadata.id ?? "",
		},
		update,
		bind,
	];
}

/** The spec a write sends: `change` applied to what the policy holds now. */
export type PolicySpecChange = (spec: PolicySpec) => PolicySpec;
