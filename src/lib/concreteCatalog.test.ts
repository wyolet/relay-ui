import { describe, expect, it } from "bun:test";
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
		spec: {
			hosts: [
				{
					hostId: "h-anthropic",
					adapter: "anthropic",
					upstreamName: "claude-opus-4-7",
				},
				{
					hostId: "h-bedrock",
					adapter: "anthropic",
					upstreamName: "claude-opus-4-7",
				},
			],
		},
	} as Model,
	{
		metadata: {
			id: "m-gpt-4o",
			name: "gpt-4o",
			owner: { kind: "provider", id: "p-openai" },
		},
		spec: {
			hosts: [
				{ hostId: "h-openai", adapter: "openai", upstreamName: "gpt-4o" },
			],
		},
	} as Model,
	{
		metadata: {
			id: "m-old",
			name: "claude-2",
			owner: { kind: "provider", id: "p-anthropic" },
		},
		spec: {
			hosts: [
				{
					hostId: "h-anthropic",
					adapter: "anthropic",
					upstreamName: "claude-2",
				},
			],
			deprecation: "Use claude-opus-4-7 instead.",
		},
	} as Model,
];

describe("buildConcreteCatalog", () => {
	it("flattens provider × model × host into bindings", () => {
		const cat = buildConcreteCatalog({ providers, models, hosts });
		expect(cat).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "anthropic" },
			{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
			{ provider: "openai", model: "gpt-4o", host: "openai" },
		]);
	});

	it("drops deprecated models by default", () => {
		const cat = buildConcreteCatalog({ providers, models, hosts });
		expect(cat.find((b) => b.model === "claude-2")).toBeUndefined();
	});

	it("includes deprecated when asked", () => {
		const cat = buildConcreteCatalog({
			providers,
			models,
			hosts,
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
				spec: {
					hosts: [
						{ hostId: "h-anthropic", adapter: "x", upstreamName: "ghost" },
					],
				},
			} as Model,
		];
		const cat = buildConcreteCatalog({
			providers,
			models: orphans,
			hosts,
		});
		expect(cat).toHaveLength(0);
	});
});
