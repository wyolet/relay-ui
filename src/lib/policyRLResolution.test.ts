import { describe, expect, it } from "bun:test";
import type { ConcreteBinding } from "@/lib/catalogRef";
import {
	describeRef,
	formatScope,
	joinList,
	type LabelLookups,
	resolveRateLimitScopes,
} from "./policyRLResolution";

const CATALOG: ConcreteBinding[] = [
	{ provider: "anthropic", model: "claude-opus", host: "anthropic" },
	{ provider: "anthropic", model: "claude-opus", host: "bedrock" },
	{ provider: "anthropic", model: "claude-sonnet", host: "anthropic" },
	{ provider: "openai", model: "gpt-4o", host: "openai" },
	{ provider: "openai", model: "gpt-4o", host: "azure" },
];

const EMPTY_LABELS: LabelLookups = {
	providerByName: new Map(),
	hostByName: new Map(),
	modelByKey: new Map(),
};

const RICH_LABELS: LabelLookups = {
	providerByName: new Map([
		["anthropic", "Anthropic"],
		["openai", "OpenAI"],
	]),
	hostByName: new Map([
		["anthropic", "Anthropic Direct"],
		["bedrock", "AWS Bedrock"],
		["openai", "OpenAI Direct"],
		["azure", "Azure"],
	]),
	modelByKey: new Map([
		["anthropic/claude-opus", "Claude Opus"],
		["anthropic/claude-sonnet", "Claude Sonnet"],
		["openai/gpt-4o", "GPT-4o"],
	]),
};

describe("joinList", () => {
	it("returns empty string for 0 items", () => {
		expect(joinList([])).toBe("");
	});
	it("returns single item unchanged", () => {
		expect(joinList(["one"])).toBe("one");
	});
	it("joins two items with 'and'", () => {
		expect(joinList(["a", "b"])).toBe("a and b");
	});
	it("Oxford-comma joins 3+ items", () => {
		expect(joinList(["a", "b", "c"])).toBe("a, b, and c");
		expect(joinList(["a", "b", "c", "d"])).toBe("a, b, c, and d");
	});
});

describe("formatScope", () => {
	it("singular model and host", () => {
		expect(formatScope(1, 1)).toBe("1 model · 1 host");
	});
	it("plural models and hosts", () => {
		expect(formatScope(3, 2)).toBe("3 models · 2 hosts");
	});
	it("mixed singular/plural", () => {
		expect(formatScope(1, 2)).toBe("1 model · 2 hosts");
		expect(formatScope(2, 1)).toBe("2 models · 1 host");
	});
});

describe("describeRef", () => {
	it("provider kind — no covered hosts", () => {
		const result = describeRef(
			{
				raw: "anthropic",
				kind: "provider",
				provider: "anthropic",
				model: undefined,
				host: undefined,
			},
			RICH_LABELS,
			[],
		);
		expect(result).toBe("All Anthropic models");
	});

	it("provider kind — with covered hosts", () => {
		const covered: ConcreteBinding[] = [
			{ provider: "anthropic", model: "claude-opus", host: "anthropic" },
			{ provider: "anthropic", model: "claude-opus", host: "bedrock" },
		];
		const result = describeRef(
			{
				raw: "anthropic",
				kind: "provider",
				provider: "anthropic",
				model: undefined,
				host: undefined,
			},
			RICH_LABELS,
			covered,
		);
		expect(result).toBe(
			"All Anthropic models hosted by Anthropic Direct and AWS Bedrock",
		);
	});

	it("provider-on-host kind", () => {
		const result = describeRef(
			{
				raw: "anthropic@bedrock",
				kind: "provider-on-host",
				provider: "anthropic",
				model: undefined,
				host: "bedrock",
			},
			RICH_LABELS,
			[],
		);
		expect(result).toBe("All Anthropic models hosted by AWS Bedrock");
	});

	it("model kind — no covered hosts", () => {
		const result = describeRef(
			{
				raw: "anthropic/claude-opus",
				kind: "model",
				provider: "anthropic",
				model: "claude-opus",
				host: undefined,
			},
			RICH_LABELS,
			[],
		);
		expect(result).toBe("Claude Opus on any host");
	});

	it("model kind — with multiple covered hosts", () => {
		const covered: ConcreteBinding[] = [
			{ provider: "anthropic", model: "claude-opus", host: "anthropic" },
			{ provider: "anthropic", model: "claude-opus", host: "bedrock" },
		];
		const result = describeRef(
			{
				raw: "anthropic/claude-opus",
				kind: "model",
				provider: "anthropic",
				model: "claude-opus",
				host: undefined,
			},
			RICH_LABELS,
			covered,
		);
		expect(result).toBe(
			"Claude Opus hosted by Anthropic Direct and AWS Bedrock",
		);
	});

	it("binding kind", () => {
		const result = describeRef(
			{
				raw: "anthropic/claude-opus@bedrock",
				kind: "binding",
				provider: "anthropic",
				model: "claude-opus",
				host: "bedrock",
			},
			RICH_LABELS,
			[],
		);
		expect(result).toBe("Claude Opus hosted by AWS Bedrock");
	});

	it("host kind", () => {
		const result = describeRef(
			{
				raw: "@bedrock",
				kind: "host",
				provider: undefined,
				model: undefined,
				host: "bedrock",
			},
			RICH_LABELS,
			[],
		);
		expect(result).toBe("Every model hosted by AWS Bedrock");
	});

	it("uses slug as fallback when label not found", () => {
		const result = describeRef(
			{
				raw: "@unknown-host",
				kind: "host",
				provider: undefined,
				model: undefined,
				host: "unknown-host",
			},
			EMPTY_LABELS,
			[],
		);
		expect(result).toBe("Every model hosted by unknown-host");
	});
});

describe("resolveRateLimitScopes", () => {
	it("returns nothing for no links", () => {
		expect(resolveRateLimitScopes([], CATALOG)).toHaveLength(0);
	});

	it("counts distinct models and hosts a ref covers", () => {
		const [scopes] = resolveRateLimitScopes(
			[{ models: ["anthropic"] }],
			CATALOG,
		);
		expect(scopes?.[0]?.models).toBe(2);
		expect(scopes?.[0]?.hosts).toBe(2);
		expect(scopes?.[0]?.coveredBindings).toHaveLength(3);
	});

	it("keeps full coverage on overlapping links", () => {
		const result = resolveRateLimitScopes(
			[{ models: ["anthropic"] }, { models: ["anthropic@bedrock"] }],
			CATALOG,
		);
		expect(result[0]?.[0]?.coveredBindings).toHaveLength(3);
		expect(result[1]?.[0]?.coveredBindings).toHaveLength(1);
	});

	it("ref that doesn't parse produces null parsed with no coverage", () => {
		const [scopes] = resolveRateLimitScopes(
			[{ models: ["***invalid***"] }],
			CATALOG,
		);
		expect(scopes?.[0]?.parsed).toBeNull();
		expect(scopes?.[0]?.coveredBindings).toHaveLength(0);
	});

	it("ref that covers nothing in catalog has zero coverage", () => {
		const [scopes] = resolveRateLimitScopes(
			[{ models: ["nonexistent-provider"] }],
			CATALOG,
		);
		expect(scopes?.[0]?.models).toBe(0);
		expect(scopes?.[0]?.hosts).toBe(0);
	});
});
