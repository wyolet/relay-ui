import {
	type PseudoLimits,
	type PseudoLimitsAnswer,
	useCreatePseudoLimits,
	useDryRunPseudoLimits,
} from "@/api/hooks/pseudoLimits";
import {
	LIMIT_POINTER_FIELDS,
	type LimitRefusalField,
} from "@/limits/limitRefusal";
import type { LimitTarget } from "@/limits/limitWrites";
import { addedFromAnswer } from "@/limits/pseudoLimitsBody";
import type { AddedLimit } from "@/limits/useLimitWrites";
import { usePseudoRun } from "@/pseudo/usePseudoRun";

/** The limit added in one request; `At` is the form answers a refusal is about. */
export function usePseudoLimitRun<At>(target: LimitTarget) {
	return usePseudoRun<
		PseudoLimits,
		PseudoLimitsAnswer,
		AddedLimit,
		LimitRefusalField,
		At
	>({
		kind: "limits",
		dryRun: useDryRunPseudoLimits(),
		create: useCreatePseudoLimits(),
		pointerFields: LIMIT_POINTER_FIELDS,
		toCreated: (answer) => addedFromAnswer(answer, target),
	});
}
