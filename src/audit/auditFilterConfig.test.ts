import { describe, expect, test } from "bun:test";
import { scopeBeyondOwner } from "@/audit/auditFilterConfig";

describe("scopeBeyondOwner", () => {
	test("drops the owner from its own chain", () => {
		expect(scopeBeyondOwner(["team:t1"], { kind: "team", id: "t1" })).toEqual(
			[],
		);
		expect(
			scopeBeyondOwner(["project:p1", "team:t1"], {
				kind: "project",
				id: "p1",
			}),
		).toEqual(["team:t1"]);
	});
	test("keeps the whole chain when the owner isn't in it", () => {
		expect(scopeBeyondOwner(["team:t1"], { kind: "user", id: "u1" })).toEqual([
			"team:t1",
		]);
		expect(scopeBeyondOwner(["team:t1"], undefined)).toEqual(["team:t1"]);
	});
});
