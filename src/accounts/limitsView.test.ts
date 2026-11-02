import { describe, expect, test } from "bun:test";
import {
	hasLimitsView,
	toLimitsState,
	toLimitsView,
} from "@/accounts/limitsView";
import type { AccountLimits } from "@/api/hooks/accounts";

const team = { id: "a-team", name: "team-platform", kind: "team" } as const;
const lane = { id: "a-lane", name: "ana-project-x", kind: "member" } as const;

const limits: AccountLimits = {
	lane,
	rungs: [
		{
			account: team,
			policy: { id: "p1", name: "platform" },
			rateLimits: [
				{
					rateLimitId: "rl1",
					name: "team-rpm",
					models: ["openai"],
					shared: true,
					perLane: false,
					rules: [
						{
							meter: "requests",
							strategy: "sliding-window",
							amount: 1000,
							window: 60,
							used: 250,
							remaining: 750,
						},
					],
				},
			],
			budgets: [
				{
					budgetId: "b1",
					name: "team-monthly",
					shared: true,
					perLane: false,
					amountUsd: "50",
					period: "month",
					mode: "hard",
					spentUsd: "37.6",
					remainingUsd: "12.4",
				},
			],
		},
		{ account: lane, rateLimits: null, budgets: null },
	],
	tightest: {
		accountId: "a-team",
		kind: "budget",
		id: "b1",
		remaining: 12.4,
		label: "$12.40 left: Team monthly budget on team-platform",
	},
};

describe("toLimitsView", () => {
	const view = toLimitsView(limits);

	test("keeps the ladder order and the rung's account and policy", () => {
		expect(view.rungs.map((r) => r.accountName)).toEqual([
			"team-platform",
			"ana-project-x",
		]);
		expect(view.rungs[0]?.kindLabel).toBe("Team");
		expect(view.rungs[0]?.policy?.name).toBe("platform");
		expect(view.rungs[1]?.policy).toBeUndefined();
		expect(view.rungs[1]?.meters).toEqual([]);
	});

	test("turns rules and budgets into meters", () => {
		const [rule, budget] = view.rungs[0]?.meters ?? [];
		expect(rule?.measure).toBe("requests / 1m");
		expect(rule?.models).toEqual(["openai"]);
		expect(rule?.reading).toEqual({ usage: "250 / 1k", share: 0.25 });
		expect(budget?.measure).toBe("per month");
		expect(budget?.reading?.usage).toBe("$37.60 / $50");
	});

	test("marks the tightest limit and carries its label", () => {
		const meters = view.rungs[0]?.meters ?? [];
		expect(meters.map((m) => m.tightest)).toEqual([false, true]);
		expect(view.tightest).toEqual({
			label: "$12.40 left: Team monthly budget on team-platform",
			exhausted: false,
		});
	});

	test("per-lane links on a team read carry no reading", () => {
		const perLane = toLimitsView({
			lane: team,
			rungs: [
				{
					account: team,
					rateLimits: [
						{
							rateLimitId: "rl2",
							name: "each-rpm",
							models: null,
							shared: false,
							perLane: true,
							rules: [
								{
									meter: "tokens",
									strategy: "token-bucket",
									amount: 10_000,
									window: 3600,
								},
							],
						},
					],
					budgets: [
						{
							budgetId: "b2",
							name: "each-daily",
							shared: false,
							perLane: true,
							amountUsd: "5",
							period: "day",
							mode: "alert",
						},
					],
				},
			],
		});
		const meters = perLane.rungs[0]?.meters ?? [];
		expect(meters.map((m) => [m.perLane, m.reading])).toEqual([
			[true, undefined],
			[true, undefined],
		]);
		expect(meters[1]?.alertOnly).toBe(true);
		expect(perLane.tightest).toBeUndefined();
	});
});

describe("toLimitsState", () => {
	test("hidden when disabled or the read failed", () => {
		expect(
			toLimitsState({ data: limits, isError: false, enabled: false }),
		).toEqual({ status: "hidden" });
		expect(
			toLimitsState({ data: undefined, isError: true, enabled: true }),
		).toEqual({ status: "hidden" });
	});
	test("loading until data arrives, then ready", () => {
		expect(
			toLimitsState({ data: undefined, isError: false, enabled: true }).status,
		).toBe("loading");
		expect(
			toLimitsState({ data: limits, isError: false, enabled: true }).status,
		).toBe("ready");
	});
});

describe("hasLimitsView", () => {
	test("every caller account has one, provider accounts don't", () => {
		for (const kind of [
			"team",
			"project",
			"personal",
			"member",
			"service",
		] as const) {
			expect(hasLimitsView(kind)).toBe(true);
		}
		expect(hasLimitsView("provider")).toBe(false);
	});
});
