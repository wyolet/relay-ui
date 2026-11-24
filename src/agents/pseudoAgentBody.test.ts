import { describe, expect, it } from "bun:test";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { AgentAnswers } from "@/agents/agentWrites";
import { createdAgent, pseudoAgentBody } from "@/agents/pseudoAgentBody";

const settings = {
	name: "indexer-ab12",
	displayName: "Indexer",
	description: "Reads the docs",
	projectId: "proj-1",
	key: {
		displayName: "Indexer key",
		expiresAt: "",
		passthroughAllowed: false,
		payloadLoggingEnabled: true,
	},
};

function account(id: string): AgentAccount {
	return { id, label: id, hostId: "h1", hostLabel: "Host", needsShare: false };
}

function answers(patch: Partial<AgentAnswers>): AgentAnswers {
	return {
		displayName: "Indexer",
		access: "choose",
		reach: "all",
		accounts: [],
		poolIds: [],
		models: [],
		policyId: "",
		...patch,
	};
}

describe("pseudoAgentBody", () => {
	it("names the agent in its project with the agent label", () => {
		expect(pseudoAgentBody(settings, answers({})).metadata).toEqual({
			name: "indexer-ab12",
			displayName: "Indexer",
			description: "Reads the docs",
			labels: { "sa-type": "agent" },
			owner: { kind: "project", id: "proj-1" },
		});
	});

	it("states every credential with no models as access, never an empty spec", () => {
		expect(
			pseudoAgentBody(settings, answers({ accounts: [account("a1")] })).spec,
		).toEqual({
			access: { everyCredential: true },
			key: {
				displayName: "Indexer key",
				passthroughAllowed: false,
				payloadLoggingEnabled: true,
			},
		});
	});

	it("sends pools then accounts in pick order, with the models", () => {
		const spec = pseudoAgentBody(
			settings,
			answers({
				reach: "accounts",
				accounts: [account("a2"), account("a1")],
				poolIds: ["pool-local"],
				models: ["anthropic"],
			}),
		).spec;
		expect(spec.access).toEqual({
			everyCredential: false,
			poolIds: ["pool-local"],
			accountIds: ["a2", "a1"],
			models: ["anthropic"],
		});
	});

	it("sends only the policy for an existing one", () => {
		const spec = pseudoAgentBody(
			settings,
			answers({
				access: "policy",
				policyId: "pol-1",
				accounts: [account("a1")],
			}),
		).spec;
		expect(spec.policyId).toBe("pol-1");
		expect(spec.access).toBeUndefined();
	});

	it("names the policy on the created screen only when the request made it", () => {
		const answer = (kinds: string[]) => ({
			created: kinds.map((kind) => ({ kind, id: kind, name: kind })),
			serviceAccount: { id: "sa", name: "indexer" },
			account: { id: "acct", name: "sa-indexer" },
			policy: { id: "pol", name: "indexer-policy" },
			pools: null,
			shares: null,
			key: { id: "k", name: "indexer-key", plaintext: "sk-test" },
		});
		expect(createdAgent(answer(["service-account", "policy", "key"]))).toEqual({
			serviceAccountName: "indexer",
			keyName: "indexer-key",
			plaintext: "sk-test",
			policyName: "indexer-policy",
		});
		expect(
			createdAgent(answer(["service-account", "policy-binding", "key"]))
				.policyName,
		).toBeUndefined();
	});

	it("sends the expiry as the end of the picked day", () => {
		const body = pseudoAgentBody(
			{ ...settings, key: { ...settings.key, expiresAt: "2027-01-31" } },
			answers({}),
		);
		expect(body.spec.key?.expiresAt).toBe("2027-01-31T23:59:59.000Z");
	});
});
