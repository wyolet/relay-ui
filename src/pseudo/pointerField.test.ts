import { describe, expect, it } from "bun:test";
import { issuesByField, pointerField } from "@/pseudo/pointerField";

describe("pointerField", () => {
	const fields = {
		"/spec": "spec",
		"/spec/target": "target",
		"/spec/target/id": "targetId",
		"/spec/shareWith": "shareWith",
	} as const;

	it("picks the longest prefix, whatever the table's order", () => {
		expect(pointerField("/spec/target/id", fields)).toBe("targetId");
		expect(pointerField("/spec/target/kind", fields)).toBe("target");
		expect(pointerField("/spec/value", fields)).toBe("spec");
	});

	it("reads an array entry, and a part under it, as its list", () => {
		expect(pointerField("/spec/shareWith/0", fields)).toBe("shareWith");
		expect(pointerField("/spec/shareWith/12/id", fields)).toBe("shareWith");
	});

	it("matches whole segments only", () => {
		expect(pointerField("/spec/targets", fields)).toBe("spec");
		expect(pointerField("/specs", fields)).toBeUndefined();
	});

	it("names no field for an empty pointer or one outside the table", () => {
		expect(pointerField("", fields)).toBeUndefined();
		expect(pointerField("/metadata", fields)).toBeUndefined();
	});
});

describe("issuesByField", () => {
	it("names each issue's field, and words a hidden row's issue", () => {
		expect(
			issuesByField(
				[
					{ code: "a", kind: "pool", message: "too wide", pointer: "/x/0" },
					{ code: "b", kind: "policy", message: "exists", pointer: "" },
					{ code: "c", kind: "budget", message: "" },
				],
				{ "/x": "x" },
				"hidden",
			),
		).toEqual([
			{ field: "x", message: "too wide" },
			{ message: "exists" },
			{ message: "hidden" },
		]);
	});
});
