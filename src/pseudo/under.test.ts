import { describe, expect, it } from "bun:test";
import {
	changesAccountsUnder,
	moreStoppedLine,
	needsStopConfirm,
	type PseudoUnder,
	stoppedLanes,
	stopsWorkingCount,
	underSentences,
} from "@/pseudo/under";

const untouched: PseudoUnder = {
	lanes: 4,
	narrowed: 0,
	widened: 0,
	unreachable: null,
};

const agent2 = { kind: "account", id: "acct-2", name: "sa-s-agent-2" };
const unseen = { kind: "account", id: "acct-9" };

describe("stopsWorkingCount", () => {
	it("counts the listed accounts and those beyond the list", () => {
		expect(stopsWorkingCount(untouched)).toBe(0);
		expect(
			stopsWorkingCount({
				...untouched,
				unreachable: [agent2, unseen],
				unreachableMore: 3,
			}),
		).toBe(5);
	});
});

describe("changesAccountsUnder", () => {
	it("is false without under, as for a service account, or when no count moves", () => {
		expect(changesAccountsUnder(undefined)).toBe(false);
		expect(changesAccountsUnder(untouched)).toBe(false);
	});

	it("is true for any account narrowed, widened or stopped", () => {
		expect(changesAccountsUnder({ ...untouched, narrowed: 1 })).toBe(true);
		expect(changesAccountsUnder({ ...untouched, widened: 2 })).toBe(true);
		expect(changesAccountsUnder({ ...untouched, unreachableMore: 1 })).toBe(
			true,
		);
	});
});

describe("needsStopConfirm", () => {
	it("asks only when some account stops working", () => {
		expect(needsStopConfirm(undefined)).toBe(false);
		expect(needsStopConfirm({ ...untouched, narrowed: 3, widened: 1 })).toBe(
			false,
		);
		expect(needsStopConfirm({ ...untouched, unreachable: [agent2] })).toBe(
			true,
		);
		expect(
			needsStopConfirm({ ...untouched, unreachable: [], unreachableMore: 2 }),
		).toBe(true);
	});
});

describe("underSentences", () => {
	it("says each count that moved in its own sentence, less, more, then stop", () => {
		expect(
			underSentences(
				{
					...untouched,
					narrowed: 2,
					widened: 1,
					unreachable: [agent2],
					unreachableMore: 1,
				},
				"S project",
			),
		).toEqual([
			"2 accounts under S project get less.",
			"1 account under S project gets more.",
			"2 accounts under S project will stop working.",
		]);
	});

	it("leaves out the counts that are zero", () => {
		expect(underSentences({ ...untouched, narrowed: 1 }, "U team")).toEqual([
			"1 account under U team gets less.",
		]);
		expect(
			underSentences({ ...untouched, unreachable: [agent2] }, "U team"),
		).toEqual(["1 account under U team will stop working."]);
	});
});

describe("stoppedLanes", () => {
	it("names each with its kind, and one without a name as one you can't see", () => {
		expect(
			stoppedLanes({ ...untouched, unreachable: [agent2, unseen] }),
		).toEqual([
			{ id: "acct-2", kind: "Account", name: "sa-s-agent-2", unseen: false },
			{
				id: "acct-9",
				kind: "Account",
				name: "one you can't see",
				unseen: true,
			},
		]);
	});
});

describe("moreStoppedLine", () => {
	it("adds the ones relay didn't list after the list", () => {
		expect(
			moreStoppedLine({
				...untouched,
				unreachable: [agent2],
				unreachableMore: 4,
			}),
		).toBe("and 4 more");
	});

	it("says nothing when relay listed them all, or listed none", () => {
		expect(
			moreStoppedLine({ ...untouched, unreachable: [agent2] }),
		).toBeUndefined();
		expect(
			moreStoppedLine({ ...untouched, unreachable: [], unreachableMore: 4 }),
		).toBeUndefined();
	});
});
