import { describe, expect, test } from "bun:test";
import type { Pool } from "@/api/hooks/pools";
import type { HostKey } from "@/api/types/hostkey";
import {
	moveItem,
	POOL_SELECTIONS,
	poolHoldsKey,
	poolMemberSummary,
	SELECTION_LABELS,
} from "@/pools/poolKeys";

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

const makePool = (o: {
	accountIds?: string[];
	credentialIds?: string[];
}): Pool => ({
	metadata: { id: "p", name: "p" },
	spec: { hostId: "h", ...o },
});

test("summarises a pool's accounts and keys", () => {
	expect(
		poolMemberSummary(
			makePool({ accountIds: ["a"], credentialIds: ["k1", "k2"] }),
		),
	).toBe("1 account · 2 keys");
	expect(poolMemberSummary(makePool({}))).toBe("No members");
});

test("a pool holds a key listed itself or through its account", () => {
	const key: HostKey = {
		metadata: { id: "k", name: "k" },
		spec: { hostId: "h", accountId: "a", valueFrom: { kind: "stored" } },
	};
	expect(poolHoldsKey(makePool({ accountIds: ["a"] }), key)).toBe(true);
	expect(poolHoldsKey(makePool({ credentialIds: ["k"] }), key)).toBe(true);
	expect(poolHoldsKey(makePool({ accountIds: ["b"] }), key)).toBe(false);
});
