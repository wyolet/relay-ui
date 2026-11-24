import { useState } from "react";
import {
	changesAccountsUnder,
	needsStopConfirm,
	type PseudoUnder,
} from "@/pseudo/under";

export type UnderConfirm = ReturnType<typeof useUnderConfirm>;

/**
 * The accounts under the target from the shown dry run, and the caller's
 * confirm that some stop working. A tick holds for the answer it was given
 * on, so each new dry run asks again; a save waits for a dry run in flight.
 */
export function useUnderConfirm(
	answer: { under?: PseudoUnder } | undefined,
	dryRunPending: boolean,
) {
	const [confirmedAnswer, setConfirmedAnswer] = useState<object | null>(null);
	const under = answer?.under;
	const confirmNeeded = needsStopConfirm(under);
	const confirmed = answer !== undefined && confirmedAnswer === answer;
	return {
		/** Shown only when the change touches some account under the target. */
		under: changesAccountsUnder(under) ? under : undefined,
		confirmNeeded,
		confirmed,
		setConfirmed(on: boolean) {
			setConfirmedAnswer(on && answer ? answer : null);
		},
		blocksSave: dryRunPending || (confirmNeeded && !confirmed),
	};
}
