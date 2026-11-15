import { describe, expect, test } from "bun:test";
import { modelHostLines } from "@/lib/modelHostLines";
import type { ModelPriceSummary, PriceRow } from "@/lib/pricingMatrix";

const row = (id: string, name: string, enabled = true) => ({
	host: { id, name, displayName: name.toUpperCase(), enabled: true },
	binding: { id: `b-${id}`, adapter: "openai", enabled, upstreamName: "" },
});

const priceRow = (sheet?: string): PriceRow => ({
	model: { id: "m", slug: "m", label: "m" },
	sheet: sheet ? { name: sheet, label: sheet, enabled: true } : undefined,
	currency: "USD",
	cells: { "tokens.input": { amount: 3, unit: "per_million", tiered: false } },
	extra: 0,
	blended: null,
	served: true,
	unpriced: !sheet,
});

const summary: ModelPriceSummary = {
	hosts: [
		{
			host: { id: "h-a", slug: "a", label: "A" },
			row: priceRow("a-list"),
			unpriced: false,
		},
		{
			host: { id: "h-b", slug: "b", label: "B" },
			row: priceRow(),
			unpriced: true,
		},
	],
	lowest: null,
	unpricedHosts: [],
};

describe("modelHostLines", () => {
	test("joins each binding with its host's rates and traffic, busiest first", () => {
		const lines = modelHostLines(
			[row("h-a", "a"), row("h-b", "b", false), row("h-c", "c")],
			summary,
			true,
			new Map([["h-b", { requests: 5, usd: null }]]),
		);
		expect(lines.map((l) => l.host.id)).toEqual(["h-b", "h-a", "h-c"]);
		const [b, a, c] = lines;
		expect(a?.rates).toMatchObject({ kind: "priced", sheet: "a-list" });
		expect(b?.rates).toEqual({ kind: "unpriced" });
		expect(b?.enabled).toBe(false);
		// The matrix doesn't know c: no sheet prices it.
		expect(c?.rates).toEqual({ kind: "unpriced" });
		expect(c?.usage).toEqual({ requests: 0, usd: null });
		expect(a?.label).toBe("A");
	});

	test("rates and usage stay unknown while they load", () => {
		const [line] = modelHostLines(
			[row("h-a", "a")],
			undefined,
			false,
			undefined,
		);
		expect(line?.rates).toEqual({ kind: "loading" });
		expect(line?.usage).toBeUndefined();
	});
});
