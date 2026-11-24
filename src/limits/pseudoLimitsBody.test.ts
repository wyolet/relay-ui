import { describe, expect, it } from "bun:test";
import type { PseudoLimitsAnswer } from "@/api/hooks/pseudoLimits";
import { LIMIT_POINTER_FIELDS } from "@/limits/limitRefusal";
import type { LimitTarget } from "@/limits/limitWrites";
import {
	addedFromAnswer,
	pseudoLimitLink,
	pseudoLimitsBody,
	storedLink,
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

const DEFAULT_LINK = { shared: true, models: [] };

describe("pseudoLimitLink", () => {
	it("sends nothing for relay's defaults: shared, every model", () => {
		expect(pseudoLimitLink("budget", DEFAULT_LINK)).toBeUndefined();
		expect(pseudoLimitLink("rateLimit", DEFAULT_LINK)).toBeUndefined();
	});

	it("sends shared false for one each, with either kind", () => {
		expect(pseudoLimitLink("budget", { shared: false, models: [] })).toEqual({
			shared: false,
		});
		expect(pseudoLimitLink("rateLimit", { shared: false, models: [] })).toEqual(
			{ shared: false },
		);
	});

	it("sends a rate limit's model scope, shared or not", () => {
		expect(
			pseudoLimitLink("rateLimit", {
				shared: true,
				models: ["google/gemma4-e4b"],
			}),
		).toEqual({ models: ["google/gemma4-e4b"] });
		expect(
			pseudoLimitLink("rateLimit", { shared: false, models: ["anthropic"] }),
		).toEqual({ shared: false, models: ["anthropic"] });
	});

	it("never sends models with a budget", () => {
		expect(
			pseudoLimitLink("budget", { shared: true, models: ["anthropic"] }),
		).toBeUndefined();
		expect(
			pseudoLimitLink("budget", { shared: false, models: ["anthropic"] }),
		).toEqual({ shared: false });
	});
});

describe("pseudoLimitsBody", () => {
	it("sends a rate limit as POST /rate-limits takes its spec, for the target by id", () => {
		expect(
			pseudoLimitsBody(
				agent,
				{
					name: "indexer-rate-limit-042817",
					displayName: "Indexer rate limit",
				},
				{ kind: "rateLimit", spec: { enabled: true, rules } },
				DEFAULT_LINK,
			),
		).toEqual({
			metadata: {
				name: "indexer-rate-limit-042817",
				displayName: "Indexer rate limit",
			},
			spec: {
				target: { kind: "service-account", id: "sa-1" },
				rateLimit: { enabled: true, rules },
			},
		});
	});

	it("sends a spend cap as POST /budgets takes its spec", () => {
		expect(
			pseudoLimitsBody(
				{ kind: "team", id: "t-1" },
				{ name: "platform-cap-042817", displayName: "Platform cap" },
				{
					kind: "budget",
					spec: { amountUsd: "0.01", period: "day", mode: "hard" },
				},
				DEFAULT_LINK,
			),
		).toEqual({
			metadata: { name: "platform-cap-042817", displayName: "Platform cap" },
			spec: {
				target: { kind: "team", id: "t-1" },
				budget: { amountUsd: "0.01", period: "day", mode: "hard" },
			},
		});
	});

	it("sends one cap each as the link beside the budget", () => {
		expect(
			pseudoLimitsBody(
				{ kind: "team", id: "t-1" },
				{ name: "platform-cap-042817", displayName: "Platform cap" },
				{
					kind: "budget",
					spec: { amountUsd: "5", period: "day", mode: "hard" },
				},
				{ shared: false, models: [] },
			).spec,
		).toEqual({
			target: { kind: "team", id: "t-1" },
			budget: { amountUsd: "5", period: "day", mode: "hard" },
			link: { shared: false },
		});
	});

	it("sends one count each and the model scope as the link beside the rate limit", () => {
		expect(
			pseudoLimitsBody(
				{ kind: "project", id: "p-1" },
				{ name: "search-rate-limit-042817", displayName: "Search rate limit" },
				{ kind: "rateLimit", spec: { enabled: true, rules } },
				{ shared: false, models: ["google/gemma4-e4b"] },
			).spec,
		).toEqual({
			target: { kind: "project", id: "p-1" },
			rateLimit: { enabled: true, rules },
			link: { shared: false, models: ["google/gemma4-e4b"] },
		});
	});
});

describe("storedLink", () => {
	it("reads a link with no models as every model", () => {
		expect(storedLink({ shared: false })).toEqual({
			shared: false,
			models: [],
		});
		expect(storedLink({ shared: true, models: null })).toEqual({
			shared: true,
			models: [],
		});
	});

	it("keeps the models relay stored, in their canonical form", () => {
		expect(storedLink({ shared: true, models: ["google/gemma4-e4b"] })).toEqual(
			{ shared: true, models: ["google/gemma4-e4b"] },
		);
	});
});

describe("addedFromAnswer", () => {
	const answer: PseudoLimitsAnswer = {
		case: "copy",
		rateLimit: {
			id: "rl-1",
			name: "indexer-rate-limit",
			link: { shared: true, models: ["anthropic"] },
		},
		policy: { id: "pol-2", name: "indexer-limits" },
		warnings: [],
	};

	it("names the limit, its link as stored, the policy and what saving did to it", () => {
		expect(addedFromAnswer(answer, agent)).toEqual({
			kind: "rateLimit",
			limitName: "indexer-rate-limit",
			link: { shared: true, models: ["anthropic"] },
			policyName: "indexer-limits",
			policyCase: "copy",
			target: agent,
		});
	});

	it("reads a spend cap and its link from the budget it made", () => {
		const budget = {
			id: "b-1",
			name: "platform-cap",
			link: { shared: false },
		};
		expect(
			addedFromAnswer(
				{ ...answer, rateLimit: undefined, budget, case: "none" },
				agent,
			),
		).toMatchObject({
			kind: "budget",
			limitName: "platform-cap",
			link: { shared: false, models: [] },
		});
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

	it("maps the link options to the per-account switch and the model scope", () => {
		expect(field("/spec/link/shared")).toBe("perAccount");
		expect(field("/spec/link/models")).toBe("models");
		expect(field("/spec/link/models/1")).toBe("models");
	});

	it("names no field for the target, which the form doesn't edit", () => {
		expect(field("/spec/target")).toBeUndefined();
	});
});
