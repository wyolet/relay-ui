import { describe, expect, it } from "bun:test";
import type { PseudoLimitsAnswer } from "@/api/hooks/pseudoLimits";
import { LIMIT_POINTER_FIELDS } from "@/limits/limitRefusal";
import type { LimitTarget } from "@/limits/limitWrites";
import {
	addedFromAnswer,
	BODY_HAS_LINK,
	postsOnce,
	pseudoLimitsBody,
} from "@/limits/pseudoLimitsBody";
import { pointerField } from "@/pseudo/pointerField";

const agent: LimitTarget = {
	kind: "serviceaccount",
	id: "sa-1",
	name: "indexer",
	label: "Indexer",
	scope: { kind: "project", id: "p-1" },
};

const rules = [
	{
		amount: 3,
		meter: "requests" as const,
		strategy: "sliding-window" as const,
		window: 60,
	},
];

describe("postsOnce", () => {
	it("posts once for the link's defaults while the body has no link", () => {
		expect(postsOnce({ shared: true, models: [] }, false)).toBe(true);
	});

	it("runs the chain for one each or a model scope while the body has no link", () => {
		expect(postsOnce({ shared: false, models: [] }, false)).toBe(false);
		expect(postsOnce({ shared: true, models: ["anthropic"] }, false)).toBe(
			false,
		);
	});

	it("always posts once when the body has the link", () => {
		expect(postsOnce({ shared: false, models: ["anthropic"] }, true)).toBe(
			true,
		);
	});

	it("knows the generated body has no link yet", () => {
		expect(BODY_HAS_LINK).toBe(false);
	});
});

describe("pseudoLimitsBody", () => {
	it("sends a rate limit as POST /rate-limits takes its spec, for the target by id", () => {
		expect(
			pseudoLimitsBody(agent, "Indexer rate limit", {
				kind: "rateLimit",
				spec: { enabled: true, rules },
			}),
		).toEqual({
			metadata: { displayName: "Indexer rate limit" },
			spec: {
				target: { kind: "service-account", id: "sa-1" },
				rateLimit: { enabled: true, rules },
			},
		});
	});

	it("sends a spend cap as POST /budgets takes its spec", () => {
		expect(
			pseudoLimitsBody({ kind: "team", id: "t-1" }, "Platform cap", {
				kind: "budget",
				spec: { amountUsd: "0.01", period: "day", mode: "hard" },
			}),
		).toEqual({
			metadata: { displayName: "Platform cap" },
			spec: {
				target: { kind: "team", id: "t-1" },
				budget: { amountUsd: "0.01", period: "day", mode: "hard" },
			},
		});
	});
});

describe("addedFromAnswer", () => {
	const answer: PseudoLimitsAnswer = {
		case: "copy",
		rateLimit: { id: "rl-1", name: "indexer-rate-limit" },
		policy: { id: "pol-2", name: "indexer-limits" },
		warnings: [],
	};

	it("names the limit, the policy and what saving did to it", () => {
		expect(addedFromAnswer(answer, agent)).toEqual({
			kind: "rateLimit",
			limitName: "indexer-rate-limit",
			policyName: "indexer-limits",
			policyCase: "copy",
			target: agent,
		});
	});

	it("reads a spend cap from the budget it made", () => {
		const budget = { id: "b-1", name: "platform-cap" };
		expect(
			addedFromAnswer(
				{ ...answer, rateLimit: undefined, budget, case: "none" },
				agent,
			),
		).toMatchObject({ kind: "budget", limitName: "platform-cap" });
	});

	it("throws without the policy, which reads as a refusal", () => {
		expect(() =>
			addedFromAnswer({ ...answer, policy: undefined }, agent),
		).toThrow();
	});
});

describe("limit pointer fields", () => {
	const field = (pointer: string) =>
		pointerField(pointer, LIMIT_POINTER_FIELDS);

	it("maps each part of the body to the field that holds it", () => {
		expect(field("/metadata/displayName")).toBe("displayName");
		expect(field("/spec/budget/amountUsd")).toBe("amountUsd");
		expect(field("/spec/budget")).toBe("amountUsd");
		expect(field("/spec/rateLimit/rules/0")).toBe("rateAmount");
	});

	it("names no field for the target, which the form doesn't edit", () => {
		expect(field("/spec/target")).toBeUndefined();
	});
});
