import {
	type PseudoHostKey,
	type PseudoHostKeyCreated,
	useCreatePseudoHostKey,
	useDryRunPseudoHostKey,
} from "@/api/hooks/pseudoHostKeys";
import type { components } from "@/api/types.gen";
import { BYOK_POINTER_FIELDS, type ByokRefusalField } from "@/byok/byokRefusal";
import { storedPseudoKey } from "@/byok/pseudoByokBody";
import type { StoredKey } from "@/byok/useByokWrites";
import { usePseudoRun } from "@/pseudo/usePseudoRun";

type AccountReceiver = components["schemas"]["AccountReceiver"];

/** The key stored in one request; `At` is the form answers a refusal is about. */
export function usePseudoByokRun<At>(
	receiverLabel: (receiver: AccountReceiver) => string,
) {
	return usePseudoRun<
		PseudoHostKey,
		PseudoHostKeyCreated,
		StoredKey,
		ByokRefusalField,
		At
	>({
		kind: "host-keys",
		dryRun: useDryRunPseudoHostKey(),
		create: useCreatePseudoHostKey(),
		pointerFields: BYOK_POINTER_FIELDS,
		toCreated: (answer) => storedPseudoKey(answer, receiverLabel),
	});
}
