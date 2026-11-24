import { describe, expect, it } from "bun:test";
import {
	agentRemovalPlan,
	isAgent,
	type RemovalInput,
} from "@/agent-page/removalPlan";
import type { Account } from "@/api/hooks/accounts";
import type { Pool } from "@/api/hooks/pools";
import type { Key } from "@/api/types/key";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";

const SA = "sa-1";
const LANE = "acct-lane";

const key = (id: string): Key => ({
	metadata: { id, name: id },
	spec: { principal: { kind: "serviceaccount", id: SA }, keyHash: "" },
});
const account: Account = {
	metadata: { id: LANE, name: LANE },
	spec: { kind: "service", holder: { kind: "serviceaccount", id: SA } },
};
const policy = (id: string, poolIds: string[] = []): Policy => ({
	metadata: { id, name: id },
	spec: { poolIds },
});
const pool = (id: string): Pool => ({
	metadata: { id, name: id },
	spec: { hostId: "h" },
});
const binding = (id: string, policyId: string, accountIds: string[]) =>
	({
		metadata: { id, name: id },
		spec: { policyId, accountIds },
	}) satisfies PolicyBinding;

const own = policy("pol-own", ["pool-a"]);

function input(patch: Partial<RemovalInput> = {}): RemovalInput {
	return {
		serviceAccount: { id: SA, label: "Indexer" },
		keys: [key("k1"), key("k2")],
		account,
		bindings: [binding("b1", "pol-own", [LANE])],
		labelledPolicies: [own],
		labelledPools: [pool("pool-a")],
		policies: [own],
		keptIds: new Set(),
		...patch,
	};
}

const ids = (i: RemovalInput) => agentRemovalPlan(i).deletes.map((w) => w.id);

describe("agentRemovalPlan", () => {
	it("deletes keys, unbinds, then the service account, policy and pool", () => {
		expect(ids(input())).toEqual([
			"key:k1",
			"key:k2",
			"unbind",
			"service-account",
			"policy:pol-own",
			"pool:pool-a",
		]);
		expect(agentRemovalPlan(input()).kept).toEqual([]);
	});

	it("keeps a labelled policy another account is bound to, and its pool", () => {
		const plan = agentRemovalPlan(
			input({
				bindings: [binding("b1", "pol-own", [LANE, "acct-x", "acct-y"])],
			}),
		);
		expect(plan.deletes.map((w) => w.id)).toEqual([
			"key:k1",
			"key:k2",
			"unbind",
			"service-account",
		]);
		expect(plan.kept).toEqual([
			{
				kind: "policy",
				id: "pol-own",
				label: "pol-own",
				reason: "used by 2 other accounts",
				inUse: true,
			},
			{
				kind: "pool",
				id: "pool-a",
				label: "pool-a",
				reason: "linked by policy pol-own",
				inUse: true,
			},
		]);
	});

	it("keeps a pool another policy links", () => {
		const plan = agentRemovalPlan(
			input({ policies: [own, policy("pol-other", ["pool-a"])] }),
		);
		expect(plan.deletes.map((w) => w.id)).not.toContain("pool:pool-a");
		expect(plan.kept).toMatchObject([
			{ id: "pool-a", reason: "linked by policy pol-other", inUse: true },
		]);
	});

	it("keeps an unticked row, and the pool its kept policy links", () => {
		const plan = agentRemovalPlan(input({ keptIds: new Set(["pol-own"]) }));
		expect(plan.deletes.map((w) => w.id)).toEqual([
			"key:k1",
			"key:k2",
			"unbind",
			"service-account",
		]);
		expect(plan.kept).toMatchObject([
			{ id: "pol-own", reason: "unticked", inUse: false },
			{ id: "pool-a", reason: "linked by policy pol-own", inUse: true },
		]);
	});

	it("keeps an unticked pool", () => {
		const plan = agentRemovalPlan(input({ keptIds: new Set(["pool-a"]) }));
		expect(plan.deletes.map((w) => w.id)).toContain("policy:pol-own");
		expect(plan.kept).toMatchObject([{ id: "pool-a", inUse: false }]);
	});

	it("an agent with no labelled rows and no binding loses its keys and itself", () => {
		const plan = agentRemovalPlan(
			input({
				bindings: [],
				labelledPolicies: [],
				labelledPools: [],
				policies: [],
			}),
		);
		expect(plan.deletes.map((w) => w.id)).toEqual([
			"key:k1",
			"key:k2",
			"service-account",
		]);
		expect(plan.kept).toEqual([]);
	});

	it("unbinds from a shared policy without deleting it", () => {
		const shared = policy("pol-shared");
		expect(
			ids(
				input({
					bindings: [binding("b2", "pol-shared", [LANE, "acct-x"])],
					labelledPolicies: [],
					labelledPools: [],
					policies: [shared],
				}),
			),
		).toEqual(["key:k1", "key:k2", "unbind", "service-account"]);
	});
});

describe("isAgent", () => {
	it("reads the sa-type label", () => {
		expect(isAgent({ "sa-type": "agent" })).toBe(true);
		expect(isAgent({ "sa-type": "ci" })).toBe(false);
		expect(isAgent(undefined)).toBe(false);
	});
});
