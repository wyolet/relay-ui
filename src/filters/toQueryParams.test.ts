import { describe, expect, it } from "bun:test";
import { activeFilterCount, toQueryParams } from "@/filters/toQueryParams";
import type { FilterDef } from "@/filters/types";

const DEFS = [
	{ key: "q", type: "search", label: "Search", default: "" },
	{
		key: "status",
		type: "select",
		label: "Status",
		default: "all",
		options: [
			{ value: "all", label: "All" },
			{ value: "errors", label: "Errors" },
		],
	},
	{ key: "slow", type: "toggle", label: "Slow" },
] as const satisfies readonly FilterDef[];

describe("toQueryParams", () => {
	it("emits only non-default, non-empty values", () => {
		expect(toQueryParams(DEFS, { q: "", status: "all", slow: false })).toEqual(
			{},
		);
		expect(
			toQueryParams(DEFS, { q: "gpt", status: "errors", slow: true }),
		).toEqual({ q: "gpt", status: "errors", slow: "true" });
	});

	it("drops a select sitting on its default but keeps a changed one", () => {
		expect(toQueryParams(DEFS, { status: "all" })).toEqual({});
		expect(toQueryParams(DEFS, { status: "errors" })).toEqual({
			status: "errors",
		});
	});

	it("emits toggles only when on", () => {
		expect(toQueryParams(DEFS, { slow: false })).toEqual({});
		expect(toQueryParams(DEFS, { slow: true })).toEqual({ slow: "true" });
	});
});

describe("activeFilterCount", () => {
	it("counts active filters", () => {
		expect(activeFilterCount(DEFS, { q: "", status: "all", slow: false })).toBe(
			0,
		);
		expect(
			activeFilterCount(DEFS, { q: "x", status: "errors", slow: false }),
		).toBe(2);
	});
});
