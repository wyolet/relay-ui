import { describe, expect, it } from "bun:test";
import { pseudoTarget } from "@/pseudo/target";

describe("pseudoTarget", () => {
	it("spells a service account as relay does and keeps team and project", () => {
		expect(pseudoTarget({ kind: "serviceaccount", id: "sa-1" })).toEqual({
			kind: "service-account",
			id: "sa-1",
		});
		expect(pseudoTarget({ kind: "project", id: "p1" })).toEqual({
			kind: "project",
			id: "p1",
		});
		expect(pseudoTarget({ kind: "team", id: "t1" })).toEqual({
			kind: "team",
			id: "t1",
		});
	});
});
