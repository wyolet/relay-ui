import { describe, expect, it } from "bun:test";
import {
	parseValidRefs,
	toggleHostRef,
	toggleModelRef,
	toggleProviderRef,
} from "./catalogRefToggle";

const raws = (refs: { raw: string }[] | null) =>
	refs?.map((r) => r.raw) ?? null;

describe("parseValidRefs", () => {
	it("drops refs that don't parse", () => {
		expect(raws(parseValidRefs(["anthropic", "*", "@bedrock"]))).toEqual([
			"anthropic",
			"@bedrock",
		]);
	});
});

describe("toggleProviderRef", () => {
	it("adds the provider and drops the refs it subsumes", () => {
		const refs = parseValidRefs(["anthropic/opus", "openai", "@bedrock"]);
		expect(raws(toggleProviderRef(refs, "anthropic"))).toEqual([
			"openai",
			"@bedrock",
			"anthropic",
		]);
	});
	it("removes an existing provider grant", () => {
		const refs = parseValidRefs(["anthropic", "openai"]);
		expect(raws(toggleProviderRef(refs, "anthropic"))).toEqual(["openai"]);
	});
});

describe("toggleModelRef", () => {
	it("is a no-op under a provider grant", () => {
		const refs = parseValidRefs(["anthropic"]);
		expect(toggleModelRef(refs, "anthropic", "opus")).toBeNull();
	});
	it("adds the model and drops its binding refs", () => {
		const refs = parseValidRefs([
			"anthropic/opus@bedrock",
			"anthropic/sonnet@bedrock",
		]);
		expect(raws(toggleModelRef(refs, "anthropic", "opus"))).toEqual([
			"anthropic/sonnet@bedrock",
			"anthropic/opus",
		]);
	});
	it("removes an existing model grant", () => {
		const refs = parseValidRefs(["anthropic/opus"]);
		expect(raws(toggleModelRef(refs, "anthropic", "opus"))).toEqual([]);
	});
});

describe("toggleHostRef", () => {
	it("adds the host and drops binding refs on it", () => {
		const refs = parseValidRefs([
			"anthropic/opus@bedrock",
			"anthropic@bedrock",
			"anthropic/opus@vertex",
		]);
		expect(raws(toggleHostRef(refs, "bedrock"))).toEqual([
			"anthropic@bedrock",
			"anthropic/opus@vertex",
			"@bedrock",
		]);
	});
	it("removes an existing host grant", () => {
		const refs = parseValidRefs(["@bedrock", "openai"]);
		expect(raws(toggleHostRef(refs, "bedrock"))).toEqual(["openai"]);
	});
});
