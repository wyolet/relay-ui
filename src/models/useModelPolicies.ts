import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { whoamiQueryOptions } from "@/api/auth";
import { type MyContext, myContextsQueryOptions } from "@/api/hooks/contexts";
import {
	type ModelPolicyView,
	modelPoliciesQueryOptions,
} from "@/api/hooks/models";
import type { Fact } from "@/shared/Facts";

export type { ModelPolicyView };

/** A policy that grants the model, with its owner named for the row. */
export interface ModelPolicyLine {
	policy: ModelPolicyView;
	owner: Fact;
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The owner as a fact: its kind and name, or "Owner" and the bare kind when
 * the name isn't in what the shell already cached. */
function ownerFact(
	owner: ModelPolicyView["owner"],
	contexts: readonly MyContext[] | undefined,
	me: { userId?: string; username?: string } | undefined,
): Fact {
	const label = capitalize(owner.kind);
	if (owner.name) return { label, value: owner.name };
	const context = contexts?.find(
		(c) =>
			c.kind === owner.kind &&
			(owner.kind === "organization" || c.id === owner.id),
	);
	if (context)
		return {
			label: owner.kind === "organization" ? "Owner" : label,
			value: context.displayName || context.name,
		};
	if (
		owner.kind === "user" &&
		owner.id &&
		owner.id === me?.userId &&
		me.username
	)
		return { label, value: me.username };
	return { label: "Owner", value: owner.kind };
}

/** Policies that grant this model, with the limits each applies to it. Owner
 * names come from the contexts and whoami the shell already cached. */
export function useModelPolicies(ref: string): ModelPolicyLine[] {
	const { data } = useSuspenseQuery(modelPoliciesQueryOptions(ref));
	const { data: contexts } = useQuery({
		...myContextsQueryOptions,
		enabled: false,
	});
	const { data: me } = useQuery({ ...whoamiQueryOptions, enabled: false });
	return (data.policies ?? []).map((policy) => ({
		policy,
		owner: ownerFact(policy.owner, contexts, me),
	}));
}
