import { useQueryClient } from "@tanstack/react-query";
import { useUpdatePolicy } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type { Policy } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

interface DetachArgs {
	policyId: string;
	hostKeyId: string;
	policies: Policy[];
}

/**
 * Removes a host key from a user policy's `hostKeyIds` pool. The detachment
 * surfaces on both ends — `policy.spec.hostKeyIds` and `hostKey.policies` —
 * so we invalidate both query keys on success.
 */
export function useDetachHostKeyFromPolicy() {
	const updatePolicy = useUpdatePolicy();
	const queryClient = useQueryClient();

	async function detach({ policyId, hostKeyId, policies }: DetachArgs) {
		const policy = policies.find((p) => p.metadata.id === policyId);
		if (!policy) {
			toast("error", "Policy not found — refresh and retry.");
			return;
		}
		const nextHostKeyIds = (policy.spec.hostKeyIds ?? []).filter(
			(id) => id !== hostKeyId,
		);
		try {
			await updatePolicy.mutateAsync({
				id: policyId,
				body: {
					metadata: policy.metadata,
					spec: {
						...policy.spec,
						hostKeyIds: nextHostKeyIds.length > 0 ? nextHostKeyIds : null,
					},
				},
			});
			// `hostKey.policies` is computed server-side; refetch host keys so the
			// detached entry disappears from any list/detail view that reads it.
			void queryClient.invalidateQueries({ queryKey: ["host-keys"] });
			toast("success", `Detached from "${displayLabel(policy.metadata)}".`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to detach from policy.",
			);
		}
	}

	return { detach, isPending: updatePolicy.isPending };
}
