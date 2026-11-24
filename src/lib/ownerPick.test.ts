import { describe, expect, it } from "bun:test";
import { applyOwnerPick, type OwnerPick } from "@/lib/ownerPick";

describe("applyOwnerPick", () => {
	function applied(pick: Partial<OwnerPick>): Partial<OwnerPick> {
		const set: Partial<OwnerPick> = {};
		applyOwnerPick(pick, (field: keyof OwnerPick, value: string) => {
			Object.assign(set, { [field]: value });
		});
		return set;
	}

	it("sets only the fields the pick names", () => {
		expect(applied({ ownerKind: "team" })).toEqual({ ownerKind: "team" });
		expect(applied({ projectId: "p1" })).toEqual({ projectId: "p1" });
	});

	it("sets an emptied team or project", () => {
		expect(applied({ teamId: "" })).toEqual({ teamId: "" });
	});
});
