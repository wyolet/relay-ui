import { describe, expect, test } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import { ownProviderAccountAt } from "@/setup/providerAccount";

const account = (
	id: string,
	hostId: string,
	ownerId: string,
	spec: Partial<Account["spec"]> = {},
): Account => ({
	metadata: { id, name: id, owner: { kind: "user", id: ownerId } },
	spec: { kind: "provider", hostId, ...spec },
});

describe("ownProviderAccountAt", () => {
	test("finds the caller's own provider account at the host", () => {
		const accounts = [
			account("other-host", "h2", "me"),
			account("theirs", "h1", "bob"),
			account("shared", "h1", "me", { sourceAccountId: "real" }),
			account("mine", "h1", "me"),
		];
		expect(ownProviderAccountAt(accounts, "h1", "me")?.metadata.id).toBe(
			"mine",
		);
	});
	test("finds none when the caller has no account there", () => {
		expect(
			ownProviderAccountAt([account("theirs", "h1", "bob")], "h1", "me"),
		).toBe(undefined);
	});
});
