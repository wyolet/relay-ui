import { describe, expect, it } from "bun:test";
import {
	agentAccounts,
	hostReach,
	keylessHostIds,
	keylessPools,
} from "@/agents/agentAccounts";
import type { Account } from "@/api/hooks/accounts";
import type { Pool } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
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
			new Set(),
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
		const rows = agentAccounts(
			[share],
			[share, own],
			"me",
			hostLabel,
			new Set(),
		);
		expect(rows.map((r) => r.id)).toEqual(["share"]);
	});

	it("leaves out accounts at keyless hosts, usable or own", () => {
		const keyless = provider(
			"local",
			{ kind: "project", id: "proj" },
			{ hostId: "h-local" },
		);
		const ownKeyless = provider(
			"my-local",
			{ kind: "user", id: "me" },
			{ hostId: "h-local" },
		);
		const keyed = provider("p", { kind: "project", id: "proj" });
		const rows = agentAccounts(
			[keyless, keyed],
			[keyless, keyed, ownKeyless],
			"me",
			hostLabel,
			new Set(["h-local"]),
		);
		expect(rows.map((r) => r.id)).toEqual(["p"]);
	});
});

describe("keylessHostIds", () => {
	it("lists the hosts that take no key", () => {
		const host = (id: string, noAuth?: boolean): Host => ({
			metadata: { id, name: id },
			spec: { baseURL: "", noAuth },
		});
		expect([
			...keylessHostIds([host("a", true), host("b"), host("c", false)]),
		]).toEqual(["a"]);
	});
});

describe("keylessPools", () => {
	it("keeps the usable pools at keyless hosts", () => {
		const pool = (id: string, hostId: string): Pool => ({
			metadata: { id, name: id, displayName: `${id} pool` },
			spec: { hostId, accountIds: [] },
		});
		const rows = keylessPools(
			[pool("p1", "h-local"), pool("p2", "h1")],
			new Set(["h-local"]),
			hostLabel,
		);
		expect(rows).toEqual([
			{
				id: "p1",
				label: "p1 pool",
				hostId: "h-local",
				hostLabel: "host h-local",
			},
		]);
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
