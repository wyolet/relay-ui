import { describe, expect, it } from "bun:test";
import type { ConcreteBinding } from "@/lib/catalogRef";
import {
	describeRef,
	formatScope,
	formatScopeFromConcrete,
	joinList,
	type LabelLookups,
	resolveBindings,
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

describe("formatScopeFromConcrete", () => {
	it("deduplicates models across hosts", () => {
		const items: ConcreteBinding[] = [
			{ provider: "anthropic", model: "claude-opus", host: "anthropic" },
			{ provider: "anthropic", model: "claude-opus", host: "bedrock" },
		];
		expect(formatScopeFromConcrete(items)).toBe("1 model · 2 hosts");
	});
	it("handles single item", () => {
		const items: ConcreteBinding[] = [
			{ provider: "openai", model: "gpt-4o", host: "openai" },
		];
		expect(formatScopeFromConcrete(items)).toBe("1 model · 1 host");
	});
	it("deduplicates host axis too", () => {
		const items: ConcreteBinding[] = [
			{ provider: "anthropic", model: "claude-opus", host: "bedrock" },
			{ provider: "anthropic", model: "claude-sonnet", host: "bedrock" },
		];
		expect(formatScopeFromConcrete(items)).toBe("2 models · 1 host");
	});
});

describe("describeRef", () => {
	it("provider kind — no covered hosts", () => {
		const result = describeRef(
			{ raw: "anthropic", kind: "provider", provider: "anthropic", model: undefined, host: undefined },
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
			{ raw: "anthropic", kind: "provider", provider: "anthropic", model: undefined, host: undefined },
			RICH_LABELS,
			covered,
		);
		expect(result).toBe("All Anthropic models hosted by Anthropic Direct and AWS Bedrock");
	});

	it("provider-on-host kind", () => {
		const result = describeRef(
			{ raw: "anthropic@bedrock", kind: "provider-on-host", provider: "anthropic", model: undefined, host: "bedrock" },
			RICH_LABELS,
			[],
		);
		expect(result).toBe("All Anthropic models hosted by AWS Bedrock");
	});

	it("model kind — no covered hosts", () => {
		const result = describeRef(
			{ raw: "anthropic/claude-opus", kind: "model", provider: "anthropic", model: "claude-opus", host: undefined },
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
			{ raw: "anthropic/claude-opus", kind: "model", provider: "anthropic", model: "claude-opus", host: undefined },
			RICH_LABELS,
			covered,
		);
		expect(result).toBe("Claude Opus hosted by Anthropic Direct and AWS Bedrock");
	});

	it("binding kind", () => {
		const result = describeRef(
			{ raw: "anthropic/claude-opus@bedrock", kind: "binding", provider: "anthropic", model: "claude-opus", host: "bedrock" },
			RICH_LABELS,
			[],
		);
		expect(result).toBe("Claude Opus hosted by AWS Bedrock");
	});

	it("host kind", () => {
		const result = describeRef(
			{ raw: "@bedrock", kind: "host", provider: undefined, model: undefined, host: "bedrock" },
			RICH_LABELS,
			[],
		);
		expect(result).toBe("Every model hosted by AWS Bedrock");
	});

	it("uses slug as fallback when label not found", () => {
		const result = describeRef(
			{ raw: "@unknown-host", kind: "host", provider: undefined, model: undefined, host: "unknown-host" },
			EMPTY_LABELS,
			[],
		);
		expect(result).toBe("Every model hosted by unknown-host");
	});
});

describe("resolveBindings", () => {
	it("returns empty resolution for empty input", () => {
		const result = resolveBindings([], CATALOG);
		expect(result.perBinding).toHaveLength(0);
		expect(result.carveouts).toHaveLength(0);
	});

	it("single binding with no overlaps — all kept", () => {
		const bindings = [{ rateLimitId: "rl-1", models: ["anthropic"] }];
		const result = resolveBindings(bindings, CATALOG);
		expect(result.perBinding).toHaveLength(1);
		const ref = result.perBinding[0]?.refs[0];
		expect(ref?.kept).toBe(ref?.covered);
		expect(result.carveouts).toHaveLength(0);
	});

	it("more-specific host ref wins over broader provider ref", () => {
		const bindings = [
			{ rateLimitId: "rl-1", models: ["anthropic"] },
			{ rateLimitId: "rl-2", models: ["anthropic@bedrock"] },
		];
		const result = resolveBindings(bindings, CATALOG);
		// rl-2 (index 1) has a more-specific host ref that should win the bedrock binding
		const rl2Ref = result.perBinding[1]?.refs[0];
		expect(rl2Ref?.kept).toBeGreaterThan(0);
		// The carveout should reflect that rl-2 won bedrock bindings from rl-1
		const bedrocKCarveouts = result.carveouts.filter((c) => c.binding.host === "bedrock");
		expect(bedrocKCarveouts.every((c) => c.winner === 1)).toBe(true);
	});

	it("ref that doesn't parse produces null parsed with no coverage", () => {
		const bindings = [{ rateLimitId: "rl-1", models: ["***invalid***"] }];
		const result = resolveBindings(bindings, CATALOG);
		const ref = result.perBinding[0]?.refs[0];
		expect(ref?.parsed).toBeNull();
		expect(ref?.covered).toBe(0);
		expect(ref?.kept).toBe(0);
	});

	it("ref that covers nothing in catalog has zero coverage", () => {
		const bindings = [{ rateLimitId: "rl-1", models: ["nonexistent-provider"] }];
		const result = resolveBindings(bindings, CATALOG);
		const ref = result.perBinding[0]?.refs[0];
		expect(ref?.covered).toBe(0);
		expect(ref?.kept).toBe(0);
	});
});
