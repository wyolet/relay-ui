import { describe, expect, it } from "bun:test";
import { heldShareId } from "@/agents/accessWrites";
import type { Account } from "@/api/hooks/accounts";

function share(
	id: string,
	sourceAccountId: string,
	owner: Account["metadata"]["owner"],
): Account {
	return {
		metadata: { id, name: id, owner },
		spec: { kind: "provider", hostId: "h1", sourceAccountId },
	};
}

describe("heldShareId", () => {
	const accounts = [
		share("s-team", "src", { kind: "team", id: "t1" }),
		share("s-project", "src", { kind: "project", id: "p1" }),
		share("s-other", "other", { kind: "project", id: "p2" }),
		share("s-user", "src", { kind: "user", id: "me" }),
	];

	it("finds the receiver's share of the source account", () => {
		expect(heldShareId(accounts, "src", { kind: "project", id: "p1" })).toBe(
			"s-project",
		);
		expect(heldShareId(accounts, "src", { kind: "team", id: "t1" })).toBe(
			"s-team",
		);
	});

	it("matches a user receiver on the owner kind", () => {
		expect(heldShareId(accounts, "src", { kind: "user", id: "me" })).toBe(
			"s-user",
		);
	});

	it("finds none for another receiver or source", () => {
		expect(
			heldShareId(accounts, "src", { kind: "project", id: "p2" }),
		).toBeUndefined();
		expect(
			heldShareId(accounts, "missing", { kind: "team", id: "t1" }),
		).toBeUndefined();
	});
});
