import { describe, expect, it } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import { ownedAccountsAt, shareReceivers } from "@/byok/byokChoices";
import { type ByokAnswers, byokWrites } from "@/byok/byokWrites";
import type { WorkContext } from "@/lib/workContext";

function answers(patch: Partial<ByokAnswers>): ByokAnswers {
	return {
		hostLabel: "Anthropic",
		accountId: "",
		accountName: "Anthropic account",
		keyName: "Anthropic key",
		tierPolicyId: "",
		receivers: [],
		...patch,
	};
}

describe("byokWrites", () => {
	it("makes the account, sets its tier, stores the key, detects, then shares", () => {
		const writes = byokWrites(
			answers({
				tierPolicyId: "tier-2",
				receivers: [{ kind: "team", id: "t1", label: "Platform" }],
			}),
		);
		expect(writes.map((w) => w.id)).toEqual([
			"account",
			"tier",
			"host-key",
			"detect",
			"share:team:t1",
		]);
	});

	it("leaves an existing account and its tier as they are", () => {
		const writes = byokWrites(
			answers({ accountId: "a1", tierPolicyId: "tier-2" }),
		);
		expect(writes.map((w) => w.kind)).toEqual(["hostKey", "detect"]);
	});
});

function provider(
	id: string,
	owner: Account["metadata"]["owner"],
	spec: Partial<Account["spec"]> = {},
): Account {
	return {
		metadata: { id, name: id, displayName: id, owner },
		spec: { kind: "provider", hostId: "h1", ...spec },
	};
}

describe("ownedAccountsAt", () => {
	it("keeps the owner's own accounts at the host, shares left out", () => {
		const accounts = [
			provider("mine", { kind: "user", id: "me" }),
			provider("elsewhere", { kind: "user", id: "me" }, { hostId: "h2" }),
			provider("team", { kind: "team", id: "t1" }),
			provider(
				"share",
				{ kind: "user", id: "me" },
				{ sourceAccountId: "team" },
			),
		];
		const ids = (kind: "personal" | "team", id: string) =>
			ownedAccountsAt(accounts, "h1", { kind, id }, "me").map((a) => a.id);
		expect(ids("personal", "me")).toEqual(["mine"]);
		expect(ids("team", "t1")).toEqual(["team"]);
	});
});

describe("shareReceivers", () => {
	const contexts: WorkContext[] = [
		{ kind: "personal", id: "me", displayName: "me", admin: true },
		{ kind: "team", id: "t1", displayName: "Platform", admin: true },
		{ kind: "team", id: "t2", displayName: "Data", admin: true },
		{
			kind: "project",
			id: "p1",
			displayName: "Search",
			teamId: "t1",
			admin: true,
		},
		{
			kind: "project",
			id: "p2",
			displayName: "Billing",
			teamId: "t2",
			admin: true,
		},
	];

	it("leaves out the owner and the owning team's projects", () => {
		const ids = shareReceivers(contexts, { kind: "team", id: "t1" }).map(
			(r) => r.id,
		);
		expect(ids).toEqual(["t2", "p2"]);
	});

	it("offers every team and project to a personal account", () => {
		expect(
			shareReceivers(contexts, { kind: "personal", id: "me" }),
		).toHaveLength(4);
	});
});
