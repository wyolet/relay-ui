import { describe, expect, it } from "bun:test";
import { agentAccounts, hostReach } from "@/agents/agentAccounts";
import type { Account } from "@/api/hooks/accounts";
import type { ModelRow } from "@/models/usePickerCatalog";

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

const hostLabel = (id: string) => `host ${id}`;

describe("agentAccounts", () => {
	it("adds the caller's own accounts the scope can't reach as shares to make", () => {
		const projectOwned = provider("p", { kind: "project", id: "proj" });
		const own = provider("mine", { kind: "user", id: "me" });
		const someoneElses = provider("theirs", { kind: "user", id: "other" });
		const rows = agentAccounts(
			[projectOwned],
			[projectOwned, own, someoneElses],
			"me",
			hostLabel,
		);
		expect(rows.map((r) => [r.id, r.needsShare])).toEqual([
			["p", false],
			["mine", true],
		]);
		expect(rows[0]?.hostLabel).toBe("host h1");
	});

	it("leaves out an own account a share in the scope already stands for", () => {
		const own = provider("mine", { kind: "user", id: "me" });
		const share = provider(
			"share",
			{ kind: "project", id: "proj" },
			{ sourceAccountId: "mine" },
		);
		const rows = agentAccounts([share], [share, own], "me", hostLabel);
		expect(rows.map((r) => r.id)).toEqual(["share"]);
	});
});

describe("hostReach", () => {
	it("keeps the models the hosts serve, with only those hosts", () => {
		const row = (name: string, hostNames: string[]): ModelRow => ({
			id: name,
			name,
			displayName: name,
			provider: "anthropic",
			hostNames,
			deprecated: false,
		});
		const reach = hostReach(
			[row("sonnet", ["anthropic", "bedrock"]), row("gpt", ["openai"])],
			["anthropic"],
		);
		expect([...reach.models]).toEqual([
			["anthropic/sonnet", { hostNames: ["anthropic"] }],
		]);
	});
});
