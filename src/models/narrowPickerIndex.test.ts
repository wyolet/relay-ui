import { describe, expect, it } from "bun:test";
import { narrowPickerIndex } from "@/models/narrowPickerIndex";
import type { HostRow, ModelRow, PickerIndex } from "@/models/usePickerCatalog";

function host(name: string): HostRow {
	return {
		id: name,
		name,
		displayName: name,
		logo: { metadata: { name }, spec: {} },
	};
}

function model(provider: string, name: string, hostNames: string[]): ModelRow {
	return {
		id: `${provider}/${name}`,
		name,
		displayName: name,
		provider,
		hostNames,
		deprecated: false,
	};
}

const rows = [
	model("openai", "gpt-4o", ["openai-api", "azure"]),
	model("openai", "o3", ["openai-api"]),
	model("anthropic", "claude", ["anthropic-api"]),
];
const hosts = [host("openai-api"), host("azure"), host("anthropic-api")];
const providers = ["openai", "anthropic"].map((p) => ({
	id: p,
	name: p,
	displayName: p,
}));

const INDEX: PickerIndex = {
	providers,
	hosts,
	hostsByName: new Map(hosts.map((h) => [h.name, h])),
	providersByName: new Map(providers.map((p) => [p.name, p])),
	modelRows: rows,
	modelsByProvider: new Map([
		["openai", rows.slice(0, 2)],
		["anthropic", rows.slice(2)],
	]),
};

describe("narrowPickerIndex", () => {
	it("keeps only reached models, with the reach's hosts and note", () => {
		const narrowed = narrowPickerIndex(INDEX, {
			models: new Map([
				["openai/gpt-4o", { hostNames: ["azure", "gone"], note: "via Main" }],
			]),
		});
		expect(narrowed.modelRows).toEqual([
			{ ...model("openai", "gpt-4o", ["azure"]), note: "via Main" },
		]);
		expect(narrowed.providers.map((p) => p.name)).toEqual(["openai"]);
		expect(narrowed.hosts.map((h) => h.name)).toEqual(["azure"]);
		expect(narrowed.modelsByProvider.get("openai")?.length).toBe(1);
		expect(narrowed.modelsByProvider.has("anthropic")).toBe(false);
	});

	it("lists nothing for an empty reach", () => {
		const narrowed = narrowPickerIndex(INDEX, { models: new Map() });
		expect(narrowed.modelRows).toEqual([]);
		expect(narrowed.providers).toEqual([]);
	});
});
