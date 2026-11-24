import { describe, expect, it } from "bun:test";
import type { AgentAccount } from "@/agents/agentAccounts";
import { type AgentAnswers, agentWrites } from "@/agents/agentWrites";

const anthropic: AgentAccount = {
	id: "a1",
	label: "Anthropic org",
	hostId: "h-anthropic",
	hostLabel: "Anthropic",
	needsShare: false,
};
const mine: AgentAccount = {
	id: "a2",
	label: "My Anthropic",
	hostId: "h-anthropic",
	hostLabel: "Anthropic",
	needsShare: true,
};
const openai: AgentAccount = {
	id: "a3",
	label: "OpenAI org",
	hostId: "h-openai",
	hostLabel: "OpenAI",
	needsShare: false,
};

function answers(patch: Partial<AgentAnswers>): AgentAnswers {
	return {
		displayName: "Indexer",
		access: "choose",
		reach: "all",
		accounts: [],
		models: [],
		policyId: "",
		...patch,
	};
}

const kinds = (a: AgentAnswers) => agentWrites(a).map((w) => w.kind);

describe("agentWrites", () => {
	it("makes no policy when nothing is narrowed", () => {
		expect(kinds(answers({}))).toEqual([
			"serviceAccount",
			"laneAccount",
			"key",
		]);
	});

	it("makes a pool-less policy for models over every credential", () => {
		const writes = agentWrites(answers({ models: ["anthropic"] }));
		expect(writes.map((w) => w.kind)).toEqual([
			"serviceAccount",
			"laneAccount",
			"policy",
			"bind",
			"key",
		]);
	});

	it("ignores picked accounts while the reach is every credential", () => {
		expect(kinds(answers({ accounts: [anthropic] }))).toEqual([
			"serviceAccount",
			"laneAccount",
			"key",
		]);
	});

	it("shares own accounts, then pools the picks per host", () => {
		const writes = agentWrites(
			answers({ reach: "accounts", accounts: [anthropic, openai, mine] }),
		);
		expect(writes.map((w) => w.id)).toEqual([
			"service-account",
			"lane-account",
			"share:a2",
			"pool:h-anthropic",
			"pool:h-openai",
			"policy",
			"bind",
			"key",
		]);
		const pool = writes.find((w) => w.id === "pool:h-anthropic");
		expect(pool).toMatchObject({
			accountIds: ["a1", "a2"],
			displayName: "Indexer Anthropic pool",
		});
	});

	it("binds an existing policy without creating one", () => {
		const writes = agentWrites(
			answers({ access: "policy", policyId: "p1", accounts: [anthropic] }),
		);
		expect(writes.map((w) => w.kind)).toEqual([
			"serviceAccount",
			"laneAccount",
			"bind",
			"key",
		]);
		expect(writes[2]).toMatchObject({ policyId: "p1" });
	});
});
