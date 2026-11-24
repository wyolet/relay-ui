import { describe, expect, it } from "bun:test";
import type { RepresentedPool } from "@/access/accessOptions";
import {
	type AccessAnswers,
	accessErrors,
	accessPlan,
	accessSpec,
	currentPolicyLine,
	linkedPoolIds,
	noWritesLine,
	poolLinks,
	unlinkedPoolIds,
} from "@/access/accessPlan";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { Policy } from "@/api/types/policy";
import type { OwnPolicyCase } from "@/policy-bindings/ownPolicy";

function account(id: string, needsShare = false, hostId = "h1"): AgentAccount {
	return {
		id,
		label: id,
		hostId,
		hostLabel: hostId === "h1" ? "Anthropic" : "OpenAI",
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

const represented: RepresentedPool[] = [
	{ id: "pool-h1", hostId: "h1", accountIds: ["a"] },
	{ id: "pool-h2", hostId: "h2", accountIds: ["o"] },
];

describe("poolLinks and linkedPoolIds", () => {
	it("keeps a host's pool listing exactly its picks, else plans a new one", () => {
		const links = poolLinks(
			answers({
				everyCredential: false,
				accounts: [account("o", false, "h2"), account("a"), account("b")],
			}),
			represented,
		);
		expect(links).toEqual([
			{ hostId: "h2", poolId: "pool-h2" },
			{ hostId: "h1" },
		]);
		expect(linkedPoolIds(["kept"], links, ["made"])).toEqual([
			"kept",
			"pool-h2",
			"made",
		]);
	});

	it("tells a reordered pick from the pool's order", () => {
		const links = poolLinks(
			answers({
				everyCredential: false,
				accounts: [account("b"), account("a")],
			}),
			[{ id: "pool-ab", hostId: "h1", accountIds: ["a", "b"] }],
		);
		expect(links).toEqual([{ hostId: "h1" }]);
	});
});

describe("accessPlan", () => {
	const kinds = (
		a: AccessAnswers,
		c: OwnPolicyCase,
		pools: readonly RepresentedPool[] = [],
	) => accessPlan(a, c, names, pools).map((w) => w.kind);
	const current = policy({
		enabled: true,
		poolIds: ["pool-h1", "pool-h2"],
		models: ["anthropic"],
	});
	const unchanged = answers({
		everyCredential: false,
		accounts: [account("a"), account("o", false, "h2")],
		models: ["anthropic"],
	});

	it("writes nothing for a target under no policy that reaches it already", () => {
		expect(kinds(answers(), create)).toEqual([]);
	});

	it("writes nothing when the target's own policy stays as it is", () => {
		expect(kinds(unchanged, update(current), represented)).toEqual([]);
		expect(kinds(answers(), update())).toEqual([]);
	});

	it("still copies and rebinds an unchanged shared policy", () => {
		expect(kinds(unchanged, copy(1, current), represented)).toEqual([
			"policyCopy",
			"policyUpdate",
			"policyBind",
		]);
	});

	it("updates only the policy when only the models change", () => {
		expect(
			kinds({ ...unchanged, models: [] }, update(current), represented),
		).toEqual(["policyUpdate"]);
	});

	it("makes one pool for a host whose picks changed", () => {
		const plan = accessPlan(
			{
				...unchanged,
				accounts: [...unchanged.accounts, account("mine", true)],
			},
			update(current),
			names,
			represented,
		);
		expect(plan.map((w) => w.id)).toEqual([
			"share:mine",
			"pool:h1",
			"policy-update",
		]);
	});

	it("makes no pool for a host whose picks were all removed", () => {
		expect(
			kinds(
				{ ...unchanged, accounts: [account("a")] },
				update(current),
				represented,
			),
		).toEqual(["policyUpdate"]);
	});

	it("still clears the pools and models of a target's own policy", () => {
		expect(kinds(answers(), update(current), represented)).toEqual([
			"policyUpdate",
		]);
	});

	it("shares, pools, then creates and binds", () => {
		const plan = accessPlan(
			answers({
				everyCredential: false,
				accounts: [account("team-acct"), account("mine", true)],
			}),
			create,
			names,
			[],
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
	const current = policy({ poolIds: ["kept", "dropped", "pool-h1"] });

	it("lists the current pools the save leaves out", () => {
		expect(
			unlinkedPoolIds(
				update(current),
				answers({
					everyCredential: false,
					keptPoolIds: ["kept"],
					accounts: [account("a")],
				}),
				represented,
			),
		).toEqual(["dropped"]);
	});

	it("drops every pool with every credential on", () => {
		expect(
			unlinkedPoolIds(
				update(current),
				answers({ keptPoolIds: ["kept"] }),
				represented,
			),
		).toEqual(["kept", "dropped", "pool-h1"]);
	});

	it("has nothing to unlink without a current policy", () => {
		expect(unlinkedPoolIds(create, answers(), [])).toEqual([]);
	});
});

describe("noWritesLine", () => {
	it("says why Save has nothing to send", () => {
		expect(noWritesLine(create, "Platform")).toBe(
			"This is what Platform reaches already.",
		);
		expect(noWritesLine(update(), "Platform")).toBe("Nothing changed.");
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
