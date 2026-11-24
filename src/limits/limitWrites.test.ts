import { describe, expect, it } from "bun:test";
import type { Policy, PolicySpec } from "@/api/types/policy";
import {
	currentCaseLine,
	defaultLimitName,
	dryRunUnpriced,
	hasAccountsUnder,
	type LimitAnswers,
	limitLink,
	limitPolicyName,
	limitSpec,
	limitWrites,
	linkCountedLine,
	linkModelLines,
	policyCaseLine,
	savedCaseLine,
	savedPolicyCase,
	targetScope,
	unpricedWarning,
	wholeRateAmount,
	withBudgetLink,
	withRateLimitLink,
} from "@/limits/limitWrites";

const team = { kind: "team" as const, id: "t1" };

function policy(owner: Policy["metadata"]["owner"] = team): Policy {
	return {
		metadata: { id: "p1", name: "p1", displayName: "Platform", owner },
		spec: { enabled: true },
	};
}

const held: PolicySpec = {
	enabled: false,
	poolIds: ["pool-1"],
	models: ["anthropic"],
	budgets: [{ budgetId: "b0", shared: true }],
	rateLimits: [{ rateLimitId: "r0", models: null, shared: true }],
};

describe("withBudgetLink", () => {
	it("appends the link and keeps everything the policy holds", () => {
		expect(withBudgetLink("b1", false)(held)).toEqual({
			...held,
			budgets: [
				{ budgetId: "b0", shared: true },
				{ budgetId: "b1", shared: false },
			],
		});
	});

	it("links on a spec with no budgets yet", () => {
		expect(withBudgetLink("b1", true)({ enabled: true })).toEqual({
			enabled: true,
			budgets: [{ budgetId: "b1", shared: true }],
		});
	});
});

describe("withRateLimitLink", () => {
	it("appends the link and keeps everything the policy holds", () => {
		expect(withRateLimitLink("r1", [], true)(held)).toEqual({
			...held,
			rateLimits: [
				{ rateLimitId: "r0", models: null, shared: true },
				{ rateLimitId: "r1", models: null, shared: true },
			],
		});
	});

	it("scopes the link to the picked models", () => {
		expect(
			withRateLimitLink("r1", ["google/gemma4-e4b"], false)({ enabled: true })
				.rateLimits,
		).toEqual([
			{ rateLimitId: "r1", models: ["google/gemma4-e4b"], shared: false },
		]);
	});
});

describe("limitWrites", () => {
	const kinds = (...args: Parameters<typeof limitWrites>) =>
		limitWrites(...args).map((w) => w.kind);

	it("makes a policy for a target under none", () => {
		expect(kinds("budget", { kind: "create" }, "Platform")).toEqual([
			"limit",
			"policyCreate",
			"policyBind",
		]);
	});

	it("updates the target's own policy in place", () => {
		const writes = limitWrites(
			"rateLimit",
			{ kind: "update", policy: policy() },
			"Platform",
		);
		expect(writes.map((w) => w.kind)).toEqual(["limit", "policyUpdate"]);
		expect(writes[0]?.label).toBe("Create the rate limit");
	});

	it("copies a shared policy, changes the copy and binds it", () => {
		const writes = limitWrites(
			"budget",
			{
				kind: "copy",
				policy: policy(),
				otherAccounts: 2,
				ownedElsewhere: false,
			},
			"Platform",
		);
		expect(writes.map((w) => w.label)).toEqual([
			"Create the spend cap",
			"Copy the policy for Platform",
			"Update the policy",
			"Apply the policy to Platform",
		]);
	});

	it("writes nothing under a policy set above the caller", () => {
		expect(
			limitWrites("budget", { kind: "above", policyId: "p9" }, "X"),
		).toEqual([]);
	});
});

describe("limitSpec", () => {
	const answers: LimitAnswers = {
		kind: "budget",
		displayName: "",
		amountUsd: "500",
		period: "month",
		mode: "hard",
		rateAmount: "1,000",
		meter: "tokens",
		per: "hour",
		models: ["anthropic"],
		perAccount: false,
	};

	it("sends only the cap for a spend cap", () => {
		expect(limitSpec(answers)).toEqual({
			kind: "budget",
			spec: { amountUsd: "500", period: "month", mode: "hard" },
		});
	});

	it("builds one sliding-window rule for the picked meter and window", () => {
		expect(limitSpec({ ...answers, kind: "rateLimit" })).toEqual({
			kind: "rateLimit",
			spec: {
				enabled: true,
				rules: [
					{
						amount: 1000,
						meter: "tokens",
						strategy: "sliding-window",
						window: 3600,
					},
				],
			},
		});
	});
});

describe("limitLink", () => {
	const answers = {
		kind: "rateLimit" as const,
		models: ["anthropic"],
		perAccount: true,
	};

	it("carries a rate limit's models and one each under a team or project", () => {
		expect(limitLink(answers, "team")).toEqual({
			shared: false,
			models: ["anthropic"],
		});
	});

	it("counts every model for a spend cap, whatever was picked before", () => {
		expect(limitLink({ ...answers, kind: "budget" }, "project")).toEqual({
			shared: false,
			models: [],
		});
	});

	it("stays shared for a service account, which has only its own account", () => {
		expect(limitLink(answers, "serviceaccount").shared).toBe(true);
	});
});

describe("linkCountedLine", () => {
	it("says whether everyone under a team or project shares the limit", () => {
		expect(linkCountedLine({ shared: true }, "team", "Platform")).toBe(
			"Once for everyone under Platform",
		);
		expect(linkCountedLine({ shared: false }, "project", "Search")).toBe(
			"Separately for each account under Search",
		);
	});

	it("says nothing for a service account, which has only its own account", () => {
		expect(
			linkCountedLine({ shared: true }, "serviceaccount", "Indexer"),
		).toBeUndefined();
	});
});

describe("linkModelLines", () => {
	it("lists a rate limit's models, or every model when it names none", () => {
		expect(
			linkModelLines("rateLimit", {
				models: ["google/gemma4-e4b", "anthropic"],
			}),
		).toEqual(["google/gemma4-e4b", "anthropic"]);
		expect(linkModelLines("rateLimit", { models: [] })).toEqual([
			"Every model",
		]);
	});

	it("lists nothing for a spend cap", () => {
		expect(linkModelLines("budget", { models: [] })).toBeUndefined();
	});
});

describe("dryRunUnpriced", () => {
	it("warns under a spend cap with the models relay lists", () => {
		expect(dryRunUnpriced("budget", ["google/gemma4-e4b"])).toEqual({
			kind: "models",
			models: ["google/gemma4-e4b"],
		});
	});

	it("says nothing for a rate limit, or when relay lists none", () => {
		expect(dryRunUnpriced("rateLimit", ["google/gemma4-e4b"])).toEqual({
			kind: "none",
		});
		expect(dryRunUnpriced("budget", [])).toEqual({ kind: "none" });
		expect(dryRunUnpriced("budget", null)).toEqual({ kind: "none" });
		expect(dryRunUnpriced("budget", undefined)).toEqual({ kind: "none" });
	});
});

describe("relay's policy case", () => {
	it("reads the chain's case in relay's terms", () => {
		expect(savedPolicyCase({ kind: "create" })).toBe("none");
		expect(savedPolicyCase({ kind: "update", policy: policy() })).toBe("own");
		expect(
			savedPolicyCase({
				kind: "copy",
				policy: policy(),
				otherAccounts: 1,
				ownedElsewhere: false,
			}),
		).toBe("copy");
		expect(() => savedPolicyCase({ kind: "above", policyId: "p9" })).toThrow();
	});

	it("says what saving did", () => {
		expect(savedCaseLine("none", "Search")).toBe("Made a policy");
		expect(savedCaseLine("own", "Search")).toBe("Added to its policy");
		expect(savedCaseLine("copy", "Search")).toBe(
			"Made a copy of the shared policy for Search",
		);
	});

	it("says what the target is under now and what saving does", () => {
		expect(currentCaseLine("none", undefined, "Search")).toBe("No policy yet");
		expect(currentCaseLine("own", "Search policy", "Search")).toBe(
			"Policy Search policy",
		);
		expect(currentCaseLine("copy", "Shared", "Search")).toBe(
			"Policy Shared, shared with other accounts or owned elsewhere: saving makes a copy for Search",
		);
	});
});

describe("wholeRateAmount", () => {
	it("reads whole numbers of 1 or more, grouped digits included", () => {
		expect(wholeRateAmount("60")).toBe(60);
		expect(wholeRateAmount("1,000")).toBe(1000);
		expect(wholeRateAmount("1 000")).toBe(1000);
	});

	it("refuses fractions, zero, text and nothing instead of truncating", () => {
		for (const raw of ["1.5", "0", "abc", "12abc", "-3", ""]) {
			expect(wholeRateAmount(raw)).toBeUndefined();
		}
	});
});

describe("unpricedWarning", () => {
	const grant = {
		model: { id: "m1", slug: "gemma", label: "Gemma" },
		hosts: [{ id: "h1", slug: "ollama", label: "Ollama" }],
	};

	it("warns only under a spend cap", () => {
		expect(unpricedWarning("rateLimit", false, null)).toEqual({ kind: "none" });
	});

	it("says it plainly when the target is under no policy", () => {
		expect(unpricedWarning("budget", false, null)).toEqual({
			kind: "noPolicy",
		});
	});

	it("lists the policy's unpriced models, and nothing when there are none", () => {
		expect(unpricedWarning("budget", true, [grant])).toEqual({
			kind: "grants",
			grants: [grant],
		});
		expect(unpricedWarning("budget", true, [])).toEqual({ kind: "none" });
		expect(unpricedWarning("budget", true, null)).toEqual({ kind: "none" });
	});
});

describe("names", () => {
	it("defaults the limit's name after the target", () => {
		expect(defaultLimitName("budget", "Platform")).toBe("Platform cap");
		expect(defaultLimitName("rateLimit", "Platform")).toBe(
			"Platform rate limit",
		);
		expect(limitPolicyName("Platform")).toBe("Platform limits");
	});
});

describe("targetScope", () => {
	it("is the team or project itself, and a service account's project", () => {
		expect(targetScope("team", "t1", "")).toEqual({ kind: "team", id: "t1" });
		expect(targetScope("project", "p1", "")).toEqual({
			kind: "project",
			id: "p1",
		});
		expect(targetScope("serviceaccount", "sa1", "p1")).toEqual({
			kind: "project",
			id: "p1",
		});
	});

	it("offers one limit per account only where accounts sit under the target", () => {
		expect(hasAccountsUnder("team")).toBe(true);
		expect(hasAccountsUnder("project")).toBe(true);
		expect(hasAccountsUnder("serviceaccount")).toBe(false);
	});
});

describe("policyCaseLine", () => {
	it("says what the target is under and what saving does", () => {
		expect(policyCaseLine({ kind: "create" }, "Platform")).toBe(
			"No policy yet",
		);
		expect(
			policyCaseLine({ kind: "update", policy: policy() }, "Platform"),
		).toBe("Policy Platform");
		expect(
			policyCaseLine(
				{
					kind: "copy",
					policy: policy(),
					otherAccounts: 1,
					ownedElsewhere: false,
				},
				"Search",
			),
		).toBe(
			"Policy Platform, shared with 1 other account: saving makes a copy for Search",
		);
		expect(
			policyCaseLine(
				{
					kind: "copy",
					policy: policy({ kind: "host", id: "h1" }),
					otherAccounts: 0,
					ownedElsewhere: true,
				},
				"Search",
			),
		).toBe(
			"Policy Platform, a provider preset: saving makes a copy for Search",
		);
		expect(policyCaseLine({ kind: "above", policyId: "p9" }, "Search")).toBe(
			"Limited by a policy you can't see or change. Ask whoever set it.",
		);
	});
});
