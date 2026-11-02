import { describe, expect, it } from "bun:test";
import { checkRefAgainstCatalog } from "./checkRefAgainstCatalog";
import type { HostRow, ModelRow, PickerIndex } from "./usePickerCatalog";

function host(name: string): HostRow {
	return {
		id: name,
		name,
		displayName: name,
		logo: { metadata: { name }, spec: {} },
	};
}

const opus: ModelRow = {
	id: "opus",
	name: "claude-opus-4-7",
	displayName: "Claude Opus",
	provider: "anthropic",
	hostNames: ["anthropic"],
	deprecated: false,
};

const hosts = [host("anthropic"), host("bedrock")];
const provider = {
	id: "anthropic",
	name: "anthropic",
	displayName: "Anthropic",
};
const index: PickerIndex = {
	providers: [provider],
	hosts,
	hostsByName: new Map(hosts.map((h) => [h.name, h])),
	providersByName: new Map([[provider.name, provider]]),
	modelRows: [opus],
	modelsByProvider: new Map([["anthropic", [opus]]]),
};

describe("checkRefAgainstCatalog", () => {
	it("accepts refs the catalog grants", () => {
		for (const ref of ["anthropic", "anthropic/claude-opus-4-7"]) {
			expect(checkRefAgainstCatalog(ref, index)).toBeUndefined();
		}
	});
	it("refuses any host part", () => {
		for (const ref of [
			"@bedrock",
			"anthropic@anthropic",
			"anthropic/claude-opus-4-7@anthropic",
		]) {
			expect(checkRefAgainstCatalog(ref, index)).toContain("pools decide");
		}
	});
	it("suggests the slugged form for dotted refs", () => {
		expect(checkRefAgainstCatalog("anthropic/claude-opus-4.7", index)).toBe(
			'"." isn\'t allowed in refs — did you mean "anthropic/claude-opus-4-7"?',
		);
	});
	it("names what the catalog is missing", () => {
		expect(checkRefAgainstCatalog("openai", index)).toBe(
			'Provider "openai" doesn\'t exist',
		);
		expect(checkRefAgainstCatalog("anthropic/claude-opus-4-6", index)).toBe(
			'Model "anthropic/claude-opus-4-6" doesn\'t exist — did you mean "anthropic/claude-opus-4-7"?',
		);
	});
});
