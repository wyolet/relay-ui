import { useNavigate } from "@tanstack/react-router";
import { useDuplicatePolicy } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";

/** Duplicates a policy and opens the copy's edit page. */
export function usePolicyDuplicate(policy: Policy) {
	const duplicate = useDuplicatePolicy();
	const navigate = useNavigate();
	const toastSaveError = useSaveErrorToast();

	function run() {
		duplicate.mutate(policy.metadata.name, {
			onSuccess: (copy) => {
				toast("success", `Created ${displayLabel(copy.metadata)}`);
				void navigate({
					to: "/policies/$name/edit",
					params: { name: copy.metadata.name },
				});
			},
			onError: (err) => toastSaveError(err, "Failed to duplicate policy."),
		});
	}

	return { duplicate: run, pending: duplicate.isPending };
}
