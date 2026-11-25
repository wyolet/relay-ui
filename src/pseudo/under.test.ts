import { describe, expect, it } from "bun:test";
import {
	changesAccountsUnder,
	hiddenStoppedLine,
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
	changed: 0,
	unreachable: null,
};

const agent2 = {
	kind: "service-account",
	id: "sa-2",
	name: "S agent 2",
} as const;
const member = { kind: "user", id: "u-1", name: "dana" } as const;

describe("stopsWorkingCount", () => {
	it("counts the listed holders, those beyond the list and those the caller can't see", () => {
		expect(stopsWorkingCount(untouched)).toBe(0);
		expect(
			stopsWorkingCount({
				...untouched,
				unreachable: [agent2, member],
				unreachableMore: 3,
				unreachableHidden: 2,
			}),
		).toBe(7);
	});
});

describe("changesAccountsUnder", () => {
	it("is false without under, as for a service account, or when no count moves", () => {
		expect(changesAccountsUnder(undefined)).toBe(false);
		expect(changesAccountsUnder(untouched)).toBe(false);
	});

	it("is true for any account narrowed, widened, changed or stopped", () => {
		expect(changesAccountsUnder({ ...untouched, narrowed: 1 })).toBe(true);
		expect(changesAccountsUnder({ ...untouched, widened: 2 })).toBe(true);
		expect(changesAccountsUnder({ ...untouched, changed: 1 })).toBe(true);
		expect(changesAccountsUnder({ ...untouched, unreachableHidden: 1 })).toBe(
			true,
		);
	});
});

describe("needsStopConfirm", () => {
	it("asks only when some account stops working, seen or not", () => {
		expect(needsStopConfirm(undefined)).toBe(false);
		expect(
			needsStopConfirm({ ...untouched, narrowed: 3, widened: 1, changed: 2 }),
		).toBe(false);
		expect(needsStopConfirm({ ...untouched, unreachable: [agent2] })).toBe(
			true,
		);
		expect(
			needsStopConfirm({ ...untouched, unreachable: [], unreachableHidden: 2 }),
		).toBe(true);
	});
});

describe("underSentences", () => {
	it("says each count in its own sentence, the first naming the target", () => {
		expect(
			underSentences(
				{ ...untouched, narrowed: 2, widened: 3, changed: 4 },
				"S project",
			),
		).toEqual([
			"2 accounts under S project get less.",
			"3 get more.",
			"4 change: they lose some and gain some.",
		]);
	});

	it("uses the singular for one", () => {
		expect(
			underSentences(
				{ ...untouched, narrowed: 1, widened: 1, changed: 1 },
				"U team",
			),
		).toEqual([
			"1 account under U team gets less.",
			"1 gets more.",
			"1 changes: it loses some and gains some.",
		]);
	});

	it("leaves out the counts that are zero; the first one shown names the target", () => {
		expect(underSentences({ ...untouched, narrowed: 2 }, "U team")).toEqual([
			"2 accounts under U team get less.",
		]);
		expect(underSentences({ ...untouched, changed: 2 }, "U team")).toEqual([
			"2 accounts under U team change: they lose some and gain some.",
		]);
		expect(
			underSentences({ ...untouched, unreachable: [agent2] }, "U team"),
		).toEqual([]);
	});
});

describe("stoppedLanes", () => {
	it("names each holder with a readable kind", () => {
		expect(
			stoppedLanes({
				...untouched,
				unreachable: [
					agent2,
					member,
					{ kind: "project", id: "p-1", name: "S project" },
					{ kind: "team", id: "t-1", name: "S team" },
				],
			}),
		).toEqual([
			{ id: "sa-2", kind: "Service account", name: "S agent 2" },
			{ id: "u-1", kind: "User", name: "dana" },
			{ id: "p-1", kind: "Project", name: "S project" },
			{ id: "t-1", kind: "Team", name: "S team" },
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

describe("hiddenStoppedLine", () => {
	it("counts the ones the caller can't see after the named ones", () => {
		expect(
			hiddenStoppedLine({
				...untouched,
				unreachable: [agent2],
				unreachableHidden: 2,
			}),
		).toBe("and 2 you can't see");
	});

	it("stands alone when none is named, and is absent at zero", () => {
		expect(hiddenStoppedLine({ ...untouched, unreachableHidden: 1 })).toBe(
			"1 you can't see",
		);
		expect(
			hiddenStoppedLine({ ...untouched, unreachable: [agent2] }),
		).toBeUndefined();
	});
});
