import { describe, expect, it } from "bun:test";
import { type AgentCopySource, agentCopyValues } from "@/agent-page/agentCopy";
import type { Policy } from "@/api/types/policy";

const SA = "sa-1";
const LANE = "acct-lane";

const own: Policy = {
	metadata: { id: "pol-own", name: "pol-own", labels: { "agent-id": SA } },
	spec: { poolIds: ["pool-a", "pool-b"], models: ["anthropic/claude-sonnet"] },
};
const shared: Policy = {
	metadata: { id: "pol-shared", name: "pol-shared" },
	spec: {},
};

function source(patch: Partial<AgentCopySource> = {}): AgentCopySource {
	return {
		serviceAccount: {
			metadata: { id: SA, name: "indexer-1234", displayName: "Indexer" },
			spec: { projectId: "project-1" },
		},
		account: {
			metadata: { id: LANE, name: LANE },
			spec: { kind: "service", holder: { kind: "serviceaccount", id: SA } },
		},
		bindings: [
			{
				metadata: { id: "b1", name: "b1" },
				spec: { policyId: "pol-own", accountIds: [LANE] },
			},
		],
		policies: [own, shared],
		pools: [
			{
				metadata: { id: "pool-a", name: "pool-a" },
				spec: { hostId: "h1", accountIds: ["acct-1", "acct-2"] },
			},
			{
				metadata: { id: "pool-b", name: "pool-b" },
				spec: { hostId: "h2", accountIds: ["acct-2", "acct-hidden"] },
			},
		],
		offeredAccountIds: ["acct-1", "acct-2"],
		...patch,
	};
}

describe("agentCopyValues", () => {
	it("reads a policy made for the agent back into accounts and models", () => {
		expect(agentCopyValues(source())).toEqual({
			displayName: "Indexer copy",
			ownerKind: "project",
			teamId: "",
			projectId: "project-1",
			access: "choose",
			reach: "accounts",
			accountIds: ["acct-1", "acct-2"],
			models: ["anthropic/claude-sonnet"],
			policyId: "",
		});
	});

	it("uses every credential when its policy links no pool", () => {
		const values = agentCopyValues(
			source({ policies: [{ ...own, spec: { models: ["openai"] } }] }),
		);
		expect(values).toMatchObject({
			access: "choose",
			reach: "all",
			accountIds: [],
			models: ["openai"],
		});
	});

	it("reuses any other bound policy", () => {
		const values = agentCopyValues(
			source({
				bindings: [
					{
						metadata: { id: "b2", name: "b2" },
						spec: { policyId: "pol-shared", accountIds: [LANE, "acct-x"] },
					},
				],
			}),
		);
		expect(values).toMatchObject({
			access: "policy",
			policyId: "pol-shared",
			accountIds: [],
			models: [],
		});
	});

	it("starts on the defaults when the agent is unbound", () => {
		expect(agentCopyValues(source({ bindings: [] }))).toMatchObject({
			displayName: "Indexer copy",
			projectId: "project-1",
			access: "choose",
			reach: "all",
			accountIds: [],
			models: [],
			policyId: "",
		});
	});

	it("does not read another agent's policy as its own", () => {
		const other: Policy = {
			...own,
			metadata: { ...own.metadata, labels: { "agent-id": "sa-2" } },
		};
		expect(agentCopyValues(source({ policies: [other] }))).toMatchObject({
			access: "policy",
			policyId: "pol-own",
		});
	});
});
