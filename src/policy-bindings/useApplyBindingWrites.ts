import {
	useCreatePolicyBinding,
	useDeletePolicyBinding,
	useUpdatePolicyBinding,
} from "@/api/hooks/policyBindings";
import type { BindingWrite } from "@/policy-bindings/attachPolicy";

/** Applies binding writes in order, stopping at the first failure. */
export function useApplyBindingWrites() {
	const create = useCreatePolicyBinding();
	const update = useUpdatePolicyBinding();
	const remove = useDeletePolicyBinding();

	return async function apply(writes: readonly BindingWrite[]): Promise<void> {
		for (const w of writes) {
			if (w.op === "create") await create.mutateAsync(w.body);
			else if (w.op === "update")
				await update.mutateAsync({ id: w.id, body: w.body });
			else await remove.mutateAsync(w.id);
		}
	};
}
