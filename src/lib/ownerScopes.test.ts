import { describe, expect, test } from "bun:test";
import { ownerKey } from "@/lib/ownerScopes";

describe("ownerKey", () => {
	test("collapses the caller's own user owner to personal", () => {
		expect(ownerKey({ kind: "user", id: "u1" }, "u1")).toBe("user");
		expect(ownerKey({ kind: "user" }, "u1")).toBe("user");
	});

	test("keeps another user's id", () => {
		expect(ownerKey({ kind: "user", id: "u2" }, "u1")).toBe("user:u2");
	});

	test("spells scoped and id-less owners", () => {
		expect(ownerKey({ kind: "project", id: "p1" }, "u1")).toBe("project:p1");
		expect(ownerKey({ kind: "system" }, "u1")).toBe("system");
		expect(ownerKey(undefined, "u1")).toBe("");
	});
});
