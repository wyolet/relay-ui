import { describe, expect, it } from "bun:test";
import type { Binding } from "@/api/hooks/bindings";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Provider } from "@/api/types/provider";
import { buildConcreteCatalog } from "./concreteCatalog";

const providers: Provider[] = [
	{
		metadata: { id: "p-anthropic", name: "anthropic" },
		spec: {},
	} as Provider,
	{
		metadata: { id: "p-openai", name: "openai" },
		spec: {},
	} as Provider,
];

const hosts: Host[] = [
	{ metadata: { id: "h-anthropic", name: "anthropic" }, spec: {} } as Host,
	{ metadata: { id: "h-bedrock", name: "bedrock" }, spec: {} } as Host,
	{ metadata: { id: "h-openai", name: "openai" }, spec: {} } as Host,
];

const models: Model[] = [
	{
		metadata: {
			id: "m-claude-opus",
			name: "claude-opus-4-7",
			owner: { kind: "provider", id: "p-anthropic" },
		},
		spec: { pointer: "", snapshots: null },
	} as Model,
	{
		metadata: {
			id: "m-gpt-4o",
			name: "gpt-4o",
			owner: { kind: "provider", id: "p-openai" },
		},
		spec: { pointer: "", snapshots: null },
	} as Model,
	{
		metadata: {
			id: "m-old",
			name: "claude-2",
			owner: { kind: "provider", id: "p-anthropic" },
		},
		spec: {
			pointer: "",
			snapshots: null,
			deprecation: "Use claude-opus-4-7 instead.",
		},
	} as Model,
];

const bind = (modelId: string, hostId: string, adapter: string): Binding =>
	({ metadata: {}, spec: { modelId, hostId, adapter } }) as Binding;

const bindings: Binding[] = [
	bind("m-claude-opus", "h-anthropic", "anthropic"),
	bind("m-claude-opus", "h-bedrock", "anthropic"),
	bind("m-gpt-4o", "h-openai", "openai"),
	bind("m-old", "h-anthropic", "anthropic"),
];

describe("buildConcreteCatalog", () => {
	it("flattens provider × model × host into bindings", () => {
		const cat = buildConcreteCatalog({ providers, models, hosts, bindings });
		expect(cat).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "anthropic" },
			{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
			{ provider: "openai", model: "gpt-4o", host: "openai" },
		]);
	});

	it("drops deprecated models by default", () => {
		const cat = buildConcreteCatalog({ providers, models, hosts, bindings });
		expect(cat.find((b) => b.model === "claude-2")).toBeUndefined();
	});

	it("includes deprecated when asked", () => {
		const cat = buildConcreteCatalog({
			providers,
			models,
			hosts,
			bindings,
			includeDeprecated: true,
		});
		expect(cat.find((b) => b.model === "claude-2")).toBeDefined();
	});

	it("skips models with unknown provider or host ids", () => {
		const orphans: Model[] = [
			{
				metadata: {
					id: "m-orphan",
					name: "ghost",
					owner: { kind: "provider", id: "does-not-exist" },
				},
				spec: { pointer: "", snapshots: null },
			} as Model,
		];
		const cat = buildConcreteCatalog({
			providers,
			models: orphans,
			hosts,
			bindings: [bind("m-orphan", "h-anthropic", "x")],
		});
		expect(cat).toHaveLength(0);
	});
});
