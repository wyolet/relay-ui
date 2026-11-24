import {
	useCreatePolicy,
	useDuplicatePolicy,
	useUpdatePolicy,
} from "@/api/hooks/policies";
import { useSetAccountPolicy } from "@/api/hooks/policyBindings";
import type { Policy } from "@/api/types/policy";
import type { components } from "@/api/types.gen";
import { required } from "@/lib/required";
import { slugWithSuffix } from "@/lib/slug";
import type {
	OwnPolicyCase,
	OwnPolicyWrite,
	PolicySpecChange,
} from "@/policy-bindings/ownPolicy";

type Owner = components["schemas"]["Owner"];

/** The policy the writes made or changed so far. */
export interface OwnPolicyProgress {
	policy?: Policy;
}

export interface OwnPolicyTarget {
	accountId: string;
	/** Owner of a policy made or copied for the account. */
	owner: Owner | undefined;
	/** Display name of a policy made or copied for the account. */
	displayName: string;
}

/** Runs {@link OwnPolicyWrite}s: create or copy, change, then bind to the account. */
export function useOwnPolicyWrites() {
	const duplicatePolicy = useDuplicatePolicy();
	const createPolicy = useCreatePolicy();
	const updatePolicy = useUpdatePolicy();
	const setAccountPolicy = useSetAccountPolicy();

	return async function runOwnPolicyWrite(
		write: OwnPolicyWrite,
		made: OwnPolicyProgress,
		policyCase: OwnPolicyCase,
		target: OwnPolicyTarget,
		change: PolicySpecChange,
	): Promise<void> {
		const metadata = {
			displayName: target.displayName,
			...(target.owner ? { owner: target.owner } : {}),
		};
		switch (write.kind) {
			case "policyCreate": {
				made.policy = await createPolicy.mutateAsync({
					metadata: { name: slugWithSuffix(target.displayName), ...metadata },
					spec: change({ enabled: true }),
				});
				return;
			}
			case "policyCopy": {
				made.policy = await duplicatePolicy.mutateAsync({
					ref: write.sourceId,
					...metadata,
				});
				return;
			}
			case "policyUpdate": {
				const current =
					made.policy ??
					(policyCase.kind === "update" ? policyCase.policy : undefined);
				const policy = required(current, "policy");
				made.policy = await updatePolicy.mutateAsync({
					id: required(policy.metadata.id, "policy id"),
					body: { metadata: policy.metadata, spec: change(policy.spec) },
				});
				return;
			}
			case "policyBind": {
				await setAccountPolicy.mutateAsync({
					accountRef: target.accountId,
					policyId: required(made.policy?.metadata.id, "policy"),
				});
				return;
			}
		}
	};
}
