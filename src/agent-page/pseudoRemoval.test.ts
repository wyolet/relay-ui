import { describe, expect, it } from "bun:test";
import {
	hiddenRowsLine,
	isRemovalDenied,
	pseudoRemovalBody,
	type RemovalList,
	refusedKeepId,
	removalList,
	removalOptions,
} from "@/agent-page/pseudoRemoval";
import { PseudoRefusal } from "@/api/types/errors";

const SA = "sa-1";

const list: RemovalList = {
	deleted: [
		{ kind: "key", id: "k1", name: "indexer-key" },
		{ kind: "policy-binding", id: "pb1", name: "indexer-binding" },
		{ kind: "service-account", id: SA, name: "indexer" },
		{ kind: "account", id: "a1", name: "sa-indexer" },
		{ kind: "pool", id: "pool-b", name: "indexer-pool-b" },
		{ kind: "policy", id: "pol-1", name: "indexer-policy" },
	],
	deletedHidden: 0,
	updated: [],
	updatedHidden: 0,
	kept: [
		{ kind: "pool", id: "pool-a", name: "indexer-pool-a", reason: "in_use" },
		{
			kind: "pool",
			id: "pool-c",
			name: "indexer-pool-c",
			reason: "kept_by_request",
		},
		{
			kind: "pool",
			id: "pool-d",
			name: "indexer-pool-d",
			reason: "not_deletable",
		},
	],
	keptHidden: 0,
};

describe("pseudoRemovalBody", () => {
	it("names only the service account for the first dry run", () => {
		expect(pseudoRemovalBody(SA, [])).toEqual({
			spec: { serviceAccountId: SA },
		});
	});

	it("sends the unticked ids as keep", () => {
		expect(pseudoRemovalBody(SA, ["pol-1"])).toEqual({
			spec: { serviceAccountId: SA, keep: ["pol-1"] },
		});
	});

	it("sends the listed deleted ids as expect with the removal", () => {
		expect(pseudoRemovalBody(SA, ["pool-c"], list.deleted)).toEqual({
			spec: {
				serviceAccountId: SA,
				keep: ["pool-c"],
				expect: ["k1", "pb1", SA, "a1", "pool-b", "pol-1"],
			},
		});
	});
});

describe("removalOptions", () => {
	it("lists the labelled policies, then pools, by name, with why each kept row stays", () => {
		expect(removalOptions(list)).toEqual([
			{
				value: "pol-1",
				label: "Policy indexer-policy",
				hint: undefined,
				disabled: false,
				notes: undefined,
			},
			{
				value: "pool-a",
				label: "Pool indexer-pool-a",
				hint: "Kept: used by something else",
				disabled: true,
				notes: undefined,
			},
			{
				value: "pool-b",
				label: "Pool indexer-pool-b",
				hint: undefined,
				disabled: false,
				notes: undefined,
			},
			{
				value: "pool-c",
				label: "Pool indexer-pool-c",
				hint: "Kept",
				disabled: false,
				notes: undefined,
			},
			{
				value: "pool-d",
				label: "Pool indexer-pool-d",
				hint: "Kept: can't be deleted here",
				disabled: true,
				notes: undefined,
			},
		]);
	});

	it("puts a refused keep's message under its row", () => {
		const options = removalOptions(list, { id: "pool-c", message: "no" });
		expect(options.find((o) => o.value === "pool-c")?.notes).toEqual(["no"]);
		expect(options.filter((o) => o.notes)).toHaveLength(1);
	});
});

describe("removalList", () => {
	it("reads the counts of rows the caller can't see, zero when relay omits them", () => {
		expect(
			removalList({
				deleted: list.deleted,
				deletedHidden: 2,
				kept: null,
				updated: [{ kind: "policy-binding", id: "pb2", name: "shared" }],
				updatedHidden: 1,
			}),
		).toEqual({
			deleted: list.deleted,
			deletedHidden: 2,
			updated: [{ kind: "policy-binding", id: "pb2", name: "shared" }],
			updatedHidden: 1,
			kept: [],
			keptHidden: 0,
		});
	});

	it("takes a 409 changed body, which has no changed rows", () => {
		expect(
			removalList({ deleted: null, kept: list.kept, keptHidden: 3 }),
		).toEqual({
			deleted: [],
			deletedHidden: 0,
			updated: [],
			updatedHidden: 0,
			kept: list.kept,
			keptHidden: 3,
		});
	});
});

describe("hiddenRowsLine", () => {
	it("counts the rows the caller can't see, and says nothing at zero", () => {
		expect(hiddenRowsLine(2)).toBe("and 2 more you can't see");
		expect(hiddenRowsLine(0)).toBeUndefined();
	});
});

describe("isRemovalDenied", () => {
	const refusedWith = (status: number) =>
		new PseudoRefusal(status, {
			error: { type: "permission_error", message: "no" },
		});

	it("is relay's 403 or 404 for a caller who may not remove the agent", () => {
		expect(isRemovalDenied(refusedWith(403))).toBe(true);
		expect(isRemovalDenied(refusedWith(404))).toBe(true);
		expect(isRemovalDenied(refusedWith(409))).toBe(false);
		expect(isRemovalDenied(new Error("offline"))).toBe(false);
	});
});

describe("refusedKeepId", () => {
	it("reads the keep entry the pointer's index names", () => {
		expect(refusedKeepId("/spec/keep/1", ["a", "b"])).toBe("b");
	});

	it("names none for another pointer or an index past the list", () => {
		expect(refusedKeepId("/spec/keep", ["a"])).toBeUndefined();
		expect(refusedKeepId("/spec/keep/3", ["a"])).toBeUndefined();
		expect(refusedKeepId("/spec/expect", ["a"])).toBeUndefined();
	});
});
