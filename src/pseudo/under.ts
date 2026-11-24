import type { components } from "@/api/types.gen";
import { rowKindLabel } from "@/pseudo/dryRun";

/** What an access or limits change does to the accounts under a team or project target. */
export type PseudoUnder = components["schemas"]["PseudoUnder"];

export const UNDER_CONFIRM_LABEL = "I understand these will stop working.";

/** Accounts under the target that served something before and serve nothing after, the unlisted and unreadable ones included. */
export function stopsWorkingCount(under: PseudoUnder): number {
	return (
		(under.unreachable ?? []).length +
		(under.unreachableMore ?? 0) +
		(under.unreachableHidden ?? 0)
	);
}

/** Whether the change touches any account under the target. */
export function changesAccountsUnder(under: PseudoUnder | undefined): boolean {
	return (
		under !== undefined &&
		(under.narrowed > 0 ||
			under.widened > 0 ||
			under.changed > 0 ||
			stopsWorkingCount(under) > 0)
	);
}

/** Whether saving needs the caller to say they know some accounts under the target stop working. */
export function needsStopConfirm(under: PseudoUnder | undefined): boolean {
	return under !== undefined && stopsWorkingCount(under) > 0;
}

interface CountSentence {
	count: number;
	one: string;
	many: string;
}

/**
 * One sentence per count above zero: less, more, changed. Only the first
 * names the target; the ones after it read on from it.
 */
export function underSentences(under: PseudoUnder, target: string): string[] {
	const sentences: CountSentence[] = [
		{ count: under.narrowed, one: "gets less.", many: "get less." },
		{ count: under.widened, one: "gets more.", many: "get more." },
		{
			count: under.changed,
			one: "changes: it loses some and gains some.",
			many: "change: they lose some and gain some.",
		},
	];
	return sentences
		.filter((s) => s.count > 0)
		.map(({ count, one, many }, i) => {
			const verb = count === 1 ? one : many;
			if (i > 0) return `${count} ${verb}`;
			return count === 1
				? `1 account under ${target} ${verb}`
				: `${count} accounts under ${target} ${verb}`;
		});
}

export interface StoppedLane {
	id: string;
	/** Who holds the lane, e.g. "Service account". */
	kind: string;
	name: string;
}

/** The listed holders whose lanes will stop working, each with its kind's label. */
export function stoppedLanes(under: PseudoUnder): StoppedLane[] {
	return (under.unreachable ?? []).map((lane) => ({
		id: lane.id,
		kind: rowKindLabel(lane.kind),
		name: lane.name,
	}));
}

/** "and N more" after the listed ones; nothing when relay listed them all, or none. */
export function moreStoppedLine(under: PseudoUnder): string | undefined {
	const more = under.unreachableMore ?? 0;
	return more > 0 && (under.unreachable ?? []).length > 0
		? `and ${more} more`
		: undefined;
}

/** The lanes the caller may not read, counted after the named ones. */
export function hiddenStoppedLine(under: PseudoUnder): string | undefined {
	const hidden = under.unreachableHidden ?? 0;
	if (hidden === 0) return undefined;
	return (under.unreachable ?? []).length > 0
		? `and ${hidden} you can't see`
		: `${hidden} you can't see`;
}
