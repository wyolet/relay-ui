import { describe, expect, test } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import { availableAccounts, chosenAccounts } from "@/pools/poolMembers";

const provider = (
	id: string,
	hostId: string,
	spec: Partial<Account["spec"]> = {},
): Account => ({
	metadata: { id, name: id },
	spec: { kind: "provider", hostId, ...spec },
});

const own = provider("own", "h1");
const shared = provider("shared", "h1", {
	sourceAccountId: "real",
	sharedBy: { kind: "user", id: "u1", name: "alice" },
});
const elsewhere = provider("elsewhere", "h2");
const personal: Account = {
	metadata: { id: "me", name: "me" },
	spec: { kind: "personal", hostId: "h1" },
};

describe("availableAccounts", () => {
	test("lists own and shared provider accounts at the host, not yet chosen", () => {
		const options = availableAccounts(
			[own, shared, elsewhere, personal],
			"h1",
			["own"],
		);
		expect(options.map((o) => o.id)).toEqual(["shared"]);
		expect(options[0]?.sharedBy).toBe("alice");
	});
});

describe("chosenAccounts", () => {
	test("keeps pool order and names rows the caller can't see by id", () => {
		const chosen = chosenAccounts(
			["shared", "0192f0aa-gone", "own"],
			[own, shared],
		);
		expect(chosen.map((o) => o.label)).toEqual([
			"shared",
			"Unknown (0192f0aa…)",
			"own",
		]);
		expect(chosen.map((o) => o.known)).toEqual([true, false, true]);
		expect(chosen[2]?.sharedBy).toBeUndefined();
	});
});
