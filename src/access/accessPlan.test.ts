import { describe, expect, it } from "bun:test";
import {
	type AccessAnswers,
	accessErrors,
	accessPlan,
	accessSpec,
	currentPolicyLine,
	unlinkedPoolIds,
} from "@/access/accessPlan";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { Policy } from "@/api/types/policy";
import type { OwnPolicyCase } from "@/policy-bindings/ownPolicy";

function account(id: string, needsShare = false): AgentAccount {
	return {
		id,
		label: id,
		hostId: "h1",
		hostLabel: "Anthropic",
		needsShare,
	};
}

function policy(
	spec: Policy["spec"] = { enabled: true },
	owner: Policy["metadata"]["owner"] = { kind: "team", id: "t1" },
): Policy {
	return {
		metadata: { id: "p1", name: "p1", displayName: "Team policy", owner },
		spec,
	};
}

const answers = (over: Partial<AccessAnswers> = {}): AccessAnswers => ({
	everyCredential: true,
	accounts: [],
	keptPoolIds: [],
	models: [],
	...over,
});

const names = { target: "Platform", scope: "Platform" };
const create: OwnPolicyCase = { kind: "create" };
const update = (p = policy()): OwnPolicyCase => ({ kind: "update", policy: p });
const copy = (otherAccounts: number, p = policy()): OwnPolicyCase => ({
	kind: "copy",
	policy: p,
	otherAccounts,
	ownedElsewhere: otherAccounts === 0,
});

describe("accessPlan", () => {
	const kinds = (a: AccessAnswers, c: OwnPolicyCase) =>
		accessPlan(a, c, names).map((w) => w.kind);

	it("writes nothing for a target under no policy that reaches it already", () => {
		expect(kinds(answers(), create)).toEqual([]);
	});

	it("still clears the pools and models of a target's own policy", () => {
		expect(kinds(answers(), update())).toEqual(["policyUpdate"]);
	});

	it("shares, pools, then creates and binds", () => {
		const plan = accessPlan(
			answers({
				everyCredential: false,
				accounts: [account("team-acct"), account("mine", true)],
			}),
			create,
			names,
		);
		expect(plan.map((w) => w.kind)).toEqual([
			"share",
			"pool",
			"policyCreate",
			"policyBind",
		]);
		expect(plan.map((w) => w.label)).toEqual([
			"Share mine with Platform",
			"Create the Anthropic pool",
			"Create the policy",
			"Apply the policy to Platform",
		]);
	});

	it("pools, then updates in place", () => {
		expect(
			kinds(
				answers({ everyCredential: false, accounts: [account("a")] }),
				update(),
			),
		).toEqual(["pool", "policyUpdate"]);
	});

	it("pools, then copies, updates and binds the copy", () => {
		expect(
			kinds(
				answers({ everyCredential: false, accounts: [account("a")] }),
				copy(2),
			),
		).toEqual(["pool", "policyCopy", "policyUpdate", "policyBind"]);
	});

	it("makes no pool for accounts while every credential is on", () => {
		expect(
			kinds(answers({ accounts: [account("a")], models: ["x"] }), create),
		).toEqual(["policyCreate", "policyBind"]);
	});

	it("writes nothing under a policy set above the caller", () => {
		expect(
			kinds(answers({ models: ["x"] }), { kind: "above", policyId: "p" }),
		).toEqual([]);
	});
});

describe("accessErrors", () => {
	it("needs an account or a kept pool once every credential is off", () => {
		expect(accessErrors(answers({ everyCredential: false }))).toEqual({
			accountIds: "Pick an account, or use every credential.",
		});
		expect(
			accessErrors(answers({ everyCredential: false, keptPoolIds: ["k"] })),
		).toEqual({});
		expect(accessErrors(answers())).toEqual({});
	});
});

describe("accessSpec", () => {
	it("replaces pools and models and keeps limits, budgets and enabled", () => {
		const spec = {
			enabled: false,
			poolIds: ["old"],
			models: ["openai"],
			rateLimits: [{ rateLimitId: "rl1", models: ["openai"], shared: true }],
			budgets: [{ budgetId: "b1", shared: false }],
		};
		expect(accessSpec(spec, ["kept", "new"], ["anthropic"])).toEqual({
			enabled: false,
			poolIds: ["kept", "new"],
			models: ["anthropic"],
			rateLimits: [{ rateLimitId: "rl1", models: ["openai"], shared: true }],
			budgets: [{ budgetId: "b1", shared: false }],
		});
	});

	it("links no pools when none are given", () => {
		expect(accessSpec({ poolIds: ["old"] }, [], []).poolIds).toBeNull();
	});
});

describe("unlinkedPoolIds", () => {
	const current = policy({ poolIds: ["kept", "dropped"] });

	it("lists the current pools the save leaves out", () => {
		expect(
			unlinkedPoolIds(
				update(current),
				answers({ everyCredential: false, keptPoolIds: ["kept"] }),
			),
		).toEqual(["dropped"]);
	});

	it("drops every pool with every credential on", () => {
		expect(
			unlinkedPoolIds(update(current), answers({ keptPoolIds: ["kept"] })),
		).toEqual(["kept", "dropped"]);
	});

	it("has nothing to unlink without a current policy", () => {
		expect(unlinkedPoolIds(create, answers())).toEqual([]);
	});
});

describe("currentPolicyLine", () => {
	it("says what the target is under and what a save does", () => {
		expect(currentPolicyLine(create, "Platform")).toBe("No policy yet");
		expect(currentPolicyLine(update(), "Platform")).toBe("Policy Team policy");
		expect(currentPolicyLine(copy(1), "Platform")).toBe(
			"Policy Team policy, shared with 1 other account: saving makes a copy for Platform",
		);
		expect(currentPolicyLine(copy(3), "Platform")).toBe(
			"Policy Team policy, shared with 3 other accounts: saving makes a copy for Platform",
		);
		expect(
			currentPolicyLine(
				copy(0, policy({}, { kind: "host", id: "anthropic" })),
				"Platform",
			),
		).toBe("Policy Team policy, a preset: saving makes a copy for Platform");
		expect(
			currentPolicyLine(
				copy(0, policy({}, { kind: "organization" })),
				"Platform",
			),
		).toBe(
			"Policy Team policy, owned by another scope: saving makes a copy for Platform",
		);
		expect(
			currentPolicyLine({ kind: "above", policyId: "p" }, "Platform"),
		).toBe("Limited by a policy you can't see or change. Ask whoever set it.");
	});
});
