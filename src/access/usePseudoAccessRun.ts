import {
	ACCESS_KIND,
	ACCESS_POINTER_FIELDS,
	type AccessRefusalField,
	savedAccess,
} from "@/access/pseudoAccessBody";
import type { SavedAccess } from "@/access/useSetAccessWrites";
import {
	type PseudoAccess,
	type PseudoAccessAnswer,
	useCreatePseudoAccess,
	useDryRunPseudoAccess,
} from "@/api/hooks/pseudoAccess";
import { usePseudoRun } from "@/pseudo/usePseudoRun";

/** The access saved in one request; `At` is the form answers a refusal is about. */
export function usePseudoAccessRun<At>(targetLabel: string) {
	return usePseudoRun<
		PseudoAccess,
		PseudoAccessAnswer,
		SavedAccess,
		AccessRefusalField,
		At
	>({
		kind: ACCESS_KIND,
		dryRun: useDryRunPseudoAccess(),
		create: useCreatePseudoAccess(),
		pointerFields: ACCESS_POINTER_FIELDS,
		toCreated: (answer) => savedAccess(answer, targetLabel),
	});
}
