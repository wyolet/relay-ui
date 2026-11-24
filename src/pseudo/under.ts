import type { components } from "@/api/types.gen";
import { rowKindLabel } from "@/pseudo/dryRun";

/** What an access or limits change does to the accounts under a team or project target. */
export type PseudoUnder = components["schemas"]["PseudoUnder"];

export const UNDER_CONFIRM_LABEL = "I understand these will stop working.";
export const UNSEEN_LANE_NAME = "one you can't see";

/** Accounts under the target that served something before and serve nothing after, the unlisted ones included. */
export function stopsWorkingCount(under: PseudoUnder): number {
	return (under.unreachable ?? []).length + (under.unreachableMore ?? 0);
}

/** Whether the change touches any account under the target. */
export function changesAccountsUnder(under: PseudoUnder | undefined): boolean {
	return (
		under !== undefined &&
		(under.narrowed > 0 || under.widened > 0 || stopsWorkingCount(under) > 0)
	);
}

/** Whether saving needs the caller to say they know some accounts under the target stop working. */
export function needsStopConfirm(under: PseudoUnder | undefined): boolean {
	return under !== undefined && stopsWorkingCount(under) > 0;
}

function accountsUnder(n: number, target: string, verbs: [string, string]) {
	return n === 1
		? `1 account under ${target} ${verbs[0]}.`
		: `${n} accounts under ${target} ${verbs[1]}.`;
}

/** One sentence per count that is not zero: less, more, stop working. */
export function underSentences(under: PseudoUnder, target: string): string[] {
	const stops = stopsWorkingCount(under);
	return [
		under.narrowed > 0 &&
			accountsUnder(under.narrowed, target, ["gets less", "get less"]),
		under.widened > 0 &&
			accountsUnder(under.widened, target, ["gets more", "get more"]),
		stops > 0 &&
			accountsUnder(stops, target, ["will stop working", "will stop working"]),
	].filter((s): s is string => typeof s === "string");
}

export interface StoppedLane {
	id: string;
	kind: string;
	name: string;
	/** The caller may not see it, so relay sent no name. */
	unseen: boolean;
}

/** The listed accounts that will stop working, each with its kind's label. */
export function stoppedLanes(under: PseudoUnder): StoppedLane[] {
	return (under.unreachable ?? []).map((lane) => ({
		id: lane.id,
		kind: rowKindLabel(lane.kind),
		name: lane.name ?? UNSEEN_LANE_NAME,
		unseen: lane.name === undefined,
	}));
}

/** "and N more" after the listed ones; nothing when relay listed them all, or none. */
export function moreStoppedLine(under: PseudoUnder): string | undefined {
	const more = under.unreachableMore ?? 0;
	return more > 0 && (under.unreachable ?? []).length > 0
		? `and ${more} more`
		: undefined;
}
