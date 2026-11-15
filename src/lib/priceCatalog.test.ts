import { describe, expect, test } from "bun:test";
import { hostCards, priceTier, rowsForTab, tierRows } from "./priceCatalog";
import { buildPricingMatrix, modelPriceSummaries } from "./pricingMatrix";

const usd = (amount: number) => ({
	amount,
	per: "1M" as const,
	currency: "USD",
});

describe("priceTier", () => {
	test("cuts at $10, $5 and $1 per 1M, upper bounds inclusive", () => {
		expect([16, 10, 8, 5, 4, 1, 0.2, 0].map((n) => priceTier(usd(n)))).toEqual([
			"top",
			"high",
			"high",
			"mid",
			"mid",
			"low",
			"low",
			"low",
		]);
	});

	test("leaves request prices, other currencies and no price untiered", () => {
		expect(priceTier({ amount: 0.02, per: "request", currency: "USD" })).toBe(
			null,
		);
		expect(priceTier({ amount: 4, per: "1M", currency: "EUR" })).toBe(null);
		expect(priceTier(null)).toBe(null);
	});
});

const rate = (meter: string, amount: number) => ({
	meter,
	amount,
	unit: "per_million",
});
const sheet = (
	name: string,
	hostId: string,
	model: string,
	i: number,
	o: number,
) => ({
	name,
	label: name,
	hostId,
	enabled: true,
	currency: "USD",
	targetModels: [model],
	rates: [rate("tokens.input", i), rate("tokens.output", o)],
});

function catalog() {
	const hosts = [
		{ id: "h1", slug: "direct", label: "Direct" },
		{ id: "h2", slug: "cloud", label: "Cloud" },
	];
	const models = [
		{ id: "fable", slug: "fable", label: "Fable", releaseDate: "2026-11-09" },
		{ id: "opus", slug: "opus", label: "Opus", releaseDate: "2026-09-22" },
		{ id: "old", slug: "old", label: "Old", releaseDate: "2023-03-14" },
		{ id: "gone", slug: "gone", label: "Gone", deprecated: true },
		{ id: "new", slug: "new", label: "New" },
	];
	const matrix = buildPricingMatrix({
		hosts,
		models,
		bindings: [
			{ hostId: "h1", modelId: "fable" },
			{ hostId: "h1", modelId: "opus" },
			{ hostId: "h2", modelId: "opus" },
			{ hostId: "h1", modelId: "old" },
			{ hostId: "h1", modelId: "gone" },
			{ hostId: "h2", modelId: "new" },
		],
		pricings: [
			sheet("f", "h1", "fable", 8, 40),
			sheet("o1", "h1", "opus", 4, 20),
			sheet("o2", "h2", "opus", 5, 25),
			sheet("x", "h1", "old", 30, 60),
			sheet("g", "h1", "gone", 15, 75),
		],
	});
	return matrix;
}

describe("tierRows", () => {
	test("tiers each model by its cheapest host", () => {
		const rows = tierRows(modelPriceSummaries(catalog()), new Map());
		const opus = rows.find((r) => r.model.id === "opus");
		expect(opus?.tier).toBe("high");
		expect(opus?.cheapest?.host.slug).toBe("direct");
		expect(opus?.hostCount).toBe(2);
		expect(rows.find((r) => r.model.id === "new")?.tier).toBe(null);
	});

	test("lists by spend, then newest; hides deprecated unless asked", () => {
		const usage = new Map([["old", { requests: 0, usd: null }]]);
		const rows = tierRows(modelPriceSummaries(catalog()), usage);
		expect(rowsForTab(rows, "top", false).map((r) => r.model.id)).toEqual([
			"fable",
			"old",
		]);
		expect(rowsForTab(rows, "top", true).map((r) => r.model.id)).toContain(
			"gone",
		);
		expect(rowsForTab(rows, "unpriced", false).map((r) => r.model.id)).toEqual([
			"new",
		]);
	});
});

describe("hostCards", () => {
	test("summarises each host, busiest first", () => {
		const cards = hostCards(
			catalog(),
			new Map([["h2", { requests: 5, usd: 1 }]]),
		);
		expect(cards.map((c) => c.host.id)).toEqual(["h2", "h1"]);
		expect(cards[0]?.unpriced).toBe(1);
		expect(cards[1]?.models).toBe(4);
		expect(cards[1]?.range).toEqual({ min: 8, max: 37.5 });
	});
});

describe("rowsForTab sort", () => {
	test("orders by price, name or newest in either direction", () => {
		const rows = tierRows(modelPriceSummaries(catalog()), new Map());
		const ids = (key: "price" | "name" | "newest", dir: "asc" | "desc") =>
			rowsForTab(rows, "top", true, { key, dir }).map((r) => r.model.id);
		expect(ids("price", "asc")).toEqual(["fable", "gone", "old"]);
		expect(ids("price", "desc")).toEqual(["old", "gone", "fable"]);
		expect(ids("name", "asc")).toEqual(["fable", "gone", "old"]);
		expect(ids("newest", "desc")[0]).toBe("fable");
	});
});
