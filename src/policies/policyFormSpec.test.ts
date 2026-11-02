import { describe, expect, it } from "bun:test";
import {
	budgetLinkShared,
	budgetLinksForIds,
	moveItem,
	type PolicySpecValues,
	rateLimitRowShared,
	specFromFormValues,
	specToFormValues,
} from "./policyFormSpec";

const EMPTY: PolicySpecValues = {
	poolIds: [],
	models: [],
	rateLimits: [],
	budgets: [],
	enabled: true,
};

describe("specFromFormValues", () => {
	it("sends empty link lists as null and models as []", () => {
		const spec = specFromFormValues(EMPTY);
		expect(spec.poolIds).toBeNull();
		expect(spec.models).toEqual([]);
		expect(spec.rateLimits).toBeNull();
		expect(spec.budgets).toBeNull();
	});

	it("keeps pool order and a lone unscoped rate limit as a link", () => {
		const spec = specFromFormValues({
			...EMPTY,
			poolIds: ["p2", "p1"],
			rateLimits: [{ rateLimitId: "rl", models: [], shared: false }],
		});
		expect(spec.poolIds).toEqual(["p2", "p1"]);
		expect(spec.rateLimits).toEqual([
			{ rateLimitId: "rl", models: null, shared: false },
		]);
	});

	it("drops rate-limit rows without a rate limit", () => {
		const spec = specFromFormValues({
			...EMPTY,
			rateLimits: [
				{ rateLimitId: "", models: [], shared: true },
				{ rateLimitId: "rl", models: ["openai/gpt-5"], shared: true },
			],
		});
		expect(spec.rateLimits).toEqual([
			{ rateLimitId: "rl", models: ["openai/gpt-5"], shared: true },
		]);
	});
});

describe("specToFormValues", () => {
	it("round-trips the edited fields", () => {
		const values: PolicySpecValues = {
			poolIds: ["p1"],
			models: ["anthropic"],
			rateLimits: [
				{ rateLimitId: "rl", models: ["anthropic/claude"], shared: false },
			],
			budgets: [{ budgetId: "b1", shared: false }],
			enabled: false,
		};
		expect(specToFormValues(specFromFormValues(values))).toEqual(values);
	});

	it("defaults omitted fields, with links shared", () => {
		expect(specToFormValues({})).toEqual(EMPTY);
		const values = specToFormValues({
			rateLimits: [{ rateLimitId: "rl" }],
			budgets: [{ budgetId: "b1" }],
		});
		expect(values.rateLimits[0]?.shared).toBe(true);
		expect(values.budgets[0]?.shared).toBe(true);
	});
});

describe("budgetLinksForIds", () => {
	it("keeps shared on kept links and starts new ones shared", () => {
		const links = [
			{ budgetId: "a", shared: false },
			{ budgetId: "b", shared: true },
		];
		expect(budgetLinksForIds(["b", "a", "c"], links)).toEqual([
			{ budgetId: "b", shared: true },
			{ budgetId: "a", shared: false },
			{ budgetId: "c", shared: true },
		]);
	});
});

describe("rateLimitRowShared", () => {
	const links = [
		{ rateLimitId: "rl", models: ["openai"], shared: false },
		{ rateLimitId: "rl", models: ["anthropic", "google"], shared: true },
	];

	it("matches the link by limit and model scope", () => {
		expect(
			rateLimitRowShared(links, { id: "rl", models: ["google", "anthropic"] }),
		).toBe(true);
		expect(rateLimitRowShared(links, { id: "rl", models: ["openai"] })).toBe(
			false,
		);
	});

	it("falls back to the first link to the limit, then to shared", () => {
		expect(rateLimitRowShared(links, { id: "rl", models: ["x"] })).toBe(false);
		expect(rateLimitRowShared(links, { id: "other" })).toBe(true);
	});
});

describe("budgetLinkShared", () => {
	it("reads the link's flag, shared when omitted", () => {
		const links = [{ budgetId: "a", shared: false }, { budgetId: "b" }];
		expect(budgetLinkShared(links, "a")).toBe(false);
		expect(budgetLinkShared(links, "b")).toBe(true);
		expect(budgetLinkShared(links, "c")).toBe(true);
	});
});

describe("moveItem", () => {
	it("swaps with the neighbour", () => {
		expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
		expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
	});

	it("leaves the ends in place", () => {
		expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
		expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
	});
});
