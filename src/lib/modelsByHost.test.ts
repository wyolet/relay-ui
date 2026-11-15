import { describe, expect, test } from "bun:test";
import type { Model, ModelSpec } from "@/api/types/model";
import {
	fmtReleaseMonth,
	groupByFamily,
	hostLines,
	IN_USE,
	inUseCount,
	inUseLines,
	type ModelsFilter,
	modelFamilyName,
	modelMatches,
	pickPane,
	railHosts,
	sortLines,
	sumUsage,
} from "./modelsByHost";
import { buildPricingMatrix, type ModelUsage } from "./pricingMatrix";

function model(id: string, spec: Partial<ModelSpec> = {}): Model {
	return {
		metadata: { id, name: id, displayName: id.toUpperCase() },
		spec: { pointer: id, snapshots: null, ...spec },
	};
}

const models = [
	model("opus-5", {
		family: "claude",
		productLine: "opus",
		releaseDate: "2026-09-01",
		capabilities: { tools: true, vision: true },
	}),
	model("opus-4", {
		family: "claude",
		productLine: "opus",
		releaseDate: "2025-05-01",
		capabilities: { tools: true },
	}),
	model("fable-1", {
		family: "claude",
		productLine: "fable",
		releaseDate: "2026-01-01",
	}),
	model("old", {
		family: "claude",
		productLine: "opus",
		deprecation: { status: "deprecated" },
	}),
	model("gpt-6", { family: "gpt", capabilities: { reasoning: true } }),
	model("mystery"),
];
const modelsById = new Map(models.map((m) => [m.metadata.id ?? "", m]));

const matrix = buildPricingMatrix({
	hosts: [
		{ id: "h-ant", slug: "anthropic", label: "Anthropic" },
		{ id: "h-oai", slug: "openai", label: "OpenAI" },
		{ id: "h-idle", slug: "idle", label: "Idle" },
	],
	models: models.map((m) => ({
		id: m.metadata.id ?? "",
		slug: m.metadata.name,
		label: m.metadata.name,
	})),
	bindings: [
		...["opus-5", "opus-4", "fable-1", "old", "mystery"].map((modelId) => ({
			hostId: "h-ant",
			modelId,
		})),
		{ hostId: "h-oai", modelId: "gpt-6" },
		{ hostId: "h-oai", modelId: "opus-5" },
		{ hostId: "h-oai", modelId: "ghost" },
	],
	pricings: [
		{
			name: "ant",
			label: "Ant",
			hostId: "h-ant",
			enabled: true,
			currency: "USD",
			targetModels: ["opus-5", "opus-4"],
			rates: [
				{ meter: "tokens.input", unit: "per_million", amount: 4 },
				{ meter: "tokens.output", unit: "per_million", amount: 20 },
			],
		},
		{
			name: "ant-cheap",
			label: "Ant cheap",
			hostId: "h-ant",
			enabled: true,
			currency: "USD",
			targetModels: ["fable-1"],
			rates: [
				{ meter: "tokens.input", unit: "per_million", amount: 1 },
				{ meter: "tokens.output", unit: "per_million", amount: 5 },
			],
		},
	],
});
const ant = matrix.find((h) => h.host.id === "h-ant");
const oai = matrix.find((h) => h.host.id === "h-oai");
if (!ant || !oai) throw new Error("fixture hosts missing");

const ALL: ModelsFilter = { q: "", cap: "any", showDeprecated: false };
const SPEND = { key: "spend", dir: "desc" } as const;
const usage = (requests: number, usd: number | null): ModelUsage => ({
	requests,
	usd,
});
const ids = (lines: { model: Model }[]) =>
	lines.map((l) => l.model.metadata.id);

describe("modelFamilyName", () => {
	test("joins family and line, falls back to the line, then Other", () => {
		expect(modelFamilyName(model("a", { family: "claude" }))).toBe("claude");
		expect(
			modelFamilyName(model("a", { family: "claude", productLine: "opus" })),
		).toBe("claude opus");
		expect(modelFamilyName(model("a", { productLine: "opus" }))).toBe("opus");
		expect(modelFamilyName(model("a"))).toBe("Other");
	});
});

describe("modelMatches", () => {
	test("hides deprecated models unless asked", () => {
		const old = modelsById.get("old");
		if (!old) throw new Error("fixture");
		expect(modelMatches(old, ALL)).toBe(false);
		expect(modelMatches(old, { ...ALL, showDeprecated: true })).toBe(true);
	});

	test("searches label, slug and family, and filters by capability", () => {
		const hits = (f: ModelsFilter) =>
			models.filter((m) => modelMatches(m, f)).map((m) => m.metadata.name);
		expect(hits({ ...ALL, q: "FABLE" })).toEqual(["fable-1"]);
		expect(hits({ ...ALL, q: "gpt" })).toEqual(["gpt-6"]);
		expect(hits({ ...ALL, cap: "tools" })).toEqual(["opus-5", "opus-4"]);
		expect(hits({ ...ALL, cap: "reasoning", q: "opus" })).toEqual([]);
	});
});

describe("hostLines", () => {
	test("served models with specs only; this host's usage attached", () => {
		const lines = hostLines(oai, modelsById, new Map([["gpt-6", usage(3, 1)]]));
		expect(ids(lines).sort()).toEqual(["gpt-6", "opus-5"]);
		expect(lines.find((l) => l.model.metadata.id === "gpt-6")?.usage).toEqual(
			usage(3, 1),
		);
	});
});

describe("sortLines", () => {
	const lines = hostLines(ant, modelsById).filter((l) =>
		modelMatches(l.model, ALL),
	);

	test("spend first, then the newest release", () => {
		const used = hostLines(
			ant,
			modelsById,
			new Map([["opus-4", usage(10, 2)]]),
		).filter((l) => modelMatches(l.model, ALL));
		expect(ids(sortLines(used, SPEND))).toEqual([
			"opus-4",
			"opus-5",
			"fable-1",
			"mystery",
		]);
	});

	test("price keeps unpriced lines last in both directions", () => {
		expect(ids(sortLines(lines, { key: "price", dir: "asc" }))).toEqual([
			"fable-1",
			"opus-5",
			"opus-4",
			"mystery",
		]);
		expect(ids(sortLines(lines, { key: "price", dir: "desc" })).at(-1)).toBe(
			"mystery",
		);
	});

	test("name sorts by display label", () => {
		expect(ids(sortLines(lines, { key: "name", dir: "asc" }))).toEqual([
			"fable-1",
			"mystery",
			"opus-4",
			"opus-5",
		]);
	});
});

describe("groupByFamily", () => {
	const lines = (u?: Map<string, ModelUsage>) =>
		hostLines(ant, modelsById, u).filter((l) => modelMatches(l.model, ALL));

	test("newest family first without spend, Other last, newest model first", () => {
		const groups = groupByFamily(lines(), SPEND);
		expect(groups.map((g) => g.label)).toEqual([
			"claude opus",
			"claude fable",
			"Other",
		]);
		expect(ids(groups[0]?.lines ?? [])).toEqual(["opus-5", "opus-4"]);
	});

	test("your spend lifts a family", () => {
		const groups = groupByFamily(
			lines(new Map([["fable-1", usage(1, 0.5)]])),
			SPEND,
		);
		expect(groups[0]?.label).toBe("claude fable");
	});

	test("a name sort orders families alphabetically, Other still last", () => {
		const groups = groupByFamily(lines(), { key: "name", dir: "desc" });
		expect(groups.map((g) => g.label)).toEqual([
			"claude opus",
			"claude fable",
			"Other",
		]);
	});
});

describe("railHosts", () => {
	test("pricing-page order, counts what the filter keeps", () => {
		const rail = railHosts(
			matrix,
			modelsById,
			new Map([["h-oai", usage(5, 3)]]),
			ALL,
		);
		expect(rail.map((r) => [r.host.slug, r.count])).toEqual([
			["openai", 2],
			["anthropic", 4],
		]);
		const searched = railHosts(matrix, modelsById, new Map(), {
			...ALL,
			q: "fable",
		});
		expect(searched.map((r) => [r.host.slug, r.count])).toEqual([
			["anthropic", 1],
			["openai", 0],
		]);
	});
});

describe("in use", () => {
	const byModel = new Map([
		["opus-5", usage(4, 2)],
		["gpt-6", usage(2, null)],
		["old", usage(1, 0.1)],
		["fable-1", usage(0, null)],
	]);

	test("counts used models once across hosts, deprecated included", () => {
		expect(inUseCount(byModel, modelsById, ALL)).toBe(3);
		expect(inUseCount(byModel, modelsById, { ...ALL, q: "gpt" })).toBe(1);
	});

	test("lists each used model once, priced at its cheapest host", () => {
		const lines = inUseLines(matrix, modelsById, byModel, ALL, SPEND);
		expect(ids(lines)).toEqual(["opus-5", "old", "gpt-6"]);
		expect(lines.length).toBe(inUseCount(byModel, modelsById, ALL));
		const opus = lines.find((l) => l.model.metadata.id === "opus-5");
		expect(opus?.host?.id).toBe("h-ant");
		expect(opus?.usage?.requests).toBe(4);
		expect(inUseLines(matrix, modelsById, new Map(), ALL, SPEND)).toEqual([]);
	});
});

describe("pickPane", () => {
	const rail = railHosts(matrix, modelsById, new Map(), ALL);

	test("keeps a listed host or In use", () => {
		expect(pickPane("anthropic", rail, false)).toBe("anthropic");
		expect(pickPane(IN_USE, rail, false)).toBe(IN_USE);
	});

	test("defaults to In use unless usage shows no traffic", () => {
		expect(pickPane(undefined, rail, undefined)).toBe(IN_USE);
		expect(pickPane("gone", rail, true)).toBe(IN_USE);
		expect(pickPane(undefined, rail, false)).toBe(rail[0]?.host.slug ?? "");
	});
});

describe("sumUsage", () => {
	test("adds requests; spend stays null when nothing was priced", () => {
		expect(sumUsage([usage(2, null), undefined, usage(1, null)])).toEqual(
			usage(3, null),
		);
		expect(sumUsage([usage(2, 1), usage(1, null)])).toEqual(usage(3, 1));
	});
});

describe("fmtReleaseMonth", () => {
	test("month and year, no timezone drift", () => {
		expect(fmtReleaseMonth("2026-09-01")).toBe("Sep 2026");
		expect(fmtReleaseMonth("2025-01")).toBe("Jan 2025");
		expect(fmtReleaseMonth(undefined)).toBe(null);
		expect(fmtReleaseMonth("soon")).toBe(null);
	});
});
