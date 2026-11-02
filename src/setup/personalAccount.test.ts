import { describe, expect, it } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import { personalAccountOf } from "./personalAccount";

const account = (id: string, spec: Account["spec"]): Account => ({
	metadata: { id, name: id },
	spec,
});

describe("personalAccountOf", () => {
	const accounts = [
		account("member", { kind: "member", holder: { kind: "user", id: "u1" } }),
		account("other", { kind: "personal", holder: { kind: "user", id: "u2" } }),
		account("mine", { kind: "personal", holder: { kind: "user", id: "u1" } }),
	];

	it("picks the personal account the user holds", () => {
		expect(personalAccountOf(accounts, "u1")?.metadata.id).toBe("mine");
	});

	it("finds nothing for a user relay has no personal account for yet", () => {
		expect(personalAccountOf(accounts, "u9")).toBeUndefined();
	});
});
