import { describe, expect, test } from "bun:test";
import { moveItem, POOL_SELECTIONS, SELECTION_LABELS } from "@/pools/poolKeys";

describe("moveItem", () => {
	test("moves an item up and down", () => {
		expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
		expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
	});

	test("leaves the ends in place", () => {
		expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
		expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
		expect(moveItem([], 0, 1)).toEqual([]);
	});

	test("never mutates its input", () => {
		const list = ["a", "b"];
		moveItem(list, 0, 1);
		expect(list).toEqual(["a", "b"]);
	});
});

test("every selection has a label", () => {
	for (const s of POOL_SELECTIONS)
		expect(SELECTION_LABELS[s].label).toBeTruthy();
});
