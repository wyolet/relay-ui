import { describe, expect, it } from "bun:test";
import type { AccountLimits } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";
import { type LadderNames, toLadder } from "./ladder";

type LimitsRung = components["schemas"]["LimitsRung"];

const team = { id: "ta", kind: "team", name: "team-platform" } as const;
const project = { id: "pa", kind: "project", name: "project-web" } as const;
const lane = { id: "sa", kind: "service", name: "sa-ci" } as const;

function rung(account: LimitsRung["account"], policy?: string): LimitsRung {
	return {
		account,
		budgets: [],
		rateLimits: [],
		...(policy ? { policy: { id: `${policy}-id`, name: policy } } : {}),
	};
}

function limits(rungs: LimitsRung[]): AccountLimits {
	return { lane, rungs };
}

const names: LadderNames = {
	scope: (a) => (a.kind === "team" ? "Team Platform" : "Project Web"),
	policy: (p) => p.name.toUpperCase(),
};

describe("toLadder", () => {
	it("lists the policies above an account that has its own", () => {
		expect(
			toLadder(
				limits([rung(team, "tp"), rung(project, "pp"), rung(lane, "own")]),
				names,
				true,
			),
		).toEqual({
			kind: "also",
			steps: [
				{
					key: "ta",
					scope: "Team Platform",
					accountName: "team-platform",
					policyName: "tp",
					policyLabel: "TP",
				},
				{
					key: "pa",
					scope: "Project Web",
					accountName: "project-web",
					policyName: "pp",
					policyLabel: "PP",
				},
			],
		});
	});

	it("says it follows the scopes above, nearest first", () => {
		const ladder = toLadder(
			limits([rung(team, "tp"), rung(project, "pp"), rung(lane)]),
			names,
			false,
		);
		expect(ladder.kind).toBe("follows");
		expect(ladder.kind === "follows" && ladder.text).toBe(
			"No policy of its own; follows Project Web's and Team Platform's.",
		);
	});

	it("skips rungs without a policy", () => {
		const ladder = toLadder(
			limits([rung(team, "tp"), rung(project), rung(lane)]),
			names,
			false,
		);
		expect(ladder.kind === "follows" && ladder.text).toBe(
			"No policy of its own; follows Team Platform's.",
		);
		expect(ladder.kind === "follows" && ladder.steps.length).toBe(1);
	});

	it("says nothing limits an account with no policy on or above it", () => {
		expect(
			toLadder(limits([rung(team), rung(project), rung(lane)]), names, false),
		).toEqual({
			kind: "unlimited",
			text: "Nothing limits it: no policy on it or above it.",
		});
	});

	it("adds nothing when only its own policy applies", () => {
		expect(
			toLadder(limits([rung(team), rung(lane, "own")]), names, true),
		).toEqual({
			kind: "own",
		});
	});

	it("takes its own policy from the binding while the limits read lags", () => {
		expect(
			toLadder(limits([rung(team, "tp"), rung(lane)]), names, true).kind,
		).toBe("also");
	});
});
