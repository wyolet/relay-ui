import { describe, expect, it } from "bun:test";
import {
	moveItem,
	type PolicySpecValues,
	specFromFormValues,
	specToFormValues,
} from "./policyFormSpec";

const EMPTY: PolicySpecValues = {
	poolIds: [],
	models: [],
	rateLimits: [],
	budgetIds: [],
	enabled: true,
	includeDeprecated: false,
	payloadLoggingEnabled: false,
};

describe("specFromFormValues", () => {
	it("sends empty lists as null", () => {
		const spec = specFromFormValues(EMPTY);
		expect(spec.poolIds).toBeNull();
		expect(spec.models).toBeNull();
		expect(spec.rateLimits).toBeNull();
		expect(spec.budgetIds).toBeNull();
	});

	it("keeps pool order and a lone unscoped rate limit as a link", () => {
		const spec = specFromFormValues({
			...EMPTY,
			poolIds: ["p2", "p1"],
			rateLimits: [{ rateLimitId: "rl", models: [] }],
		});
		expect(spec.poolIds).toEqual(["p2", "p1"]);
		expect(spec.rateLimits).toEqual([{ rateLimitId: "rl", models: null }]);
	});

	it("drops rate-limit rows without a rate limit", () => {
		const spec = specFromFormValues({
			...EMPTY,
			rateLimits: [
				{ rateLimitId: "", models: [] },
				{ rateLimitId: "rl", models: ["openai/gpt-5"] },
			],
		});
		expect(spec.rateLimits).toEqual([
			{ rateLimitId: "rl", models: ["openai/gpt-5"] },
		]);
	});

	it("never writes credentialIds", () => {
		expect("credentialIds" in specFromFormValues(EMPTY)).toBe(false);
	});
});

describe("specToFormValues", () => {
	it("round-trips the edited fields", () => {
		const values: PolicySpecValues = {
			poolIds: ["p1"],
			models: ["anthropic"],
			rateLimits: [{ rateLimitId: "rl", models: ["anthropic/claude"] }],
			budgetIds: ["b1"],
			enabled: false,
			includeDeprecated: true,
			payloadLoggingEnabled: true,
		};
		expect(specToFormValues(specFromFormValues(values))).toEqual(values);
	});

	it("defaults omitted fields", () => {
		expect(specToFormValues({})).toEqual(EMPTY);
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
