import { describe, expect, it } from "bun:test";
import { filterByText } from "./filterByText";

const rows = [
	{ name: "anthropic", label: "Anthropic" },
	{ name: "openai", label: "OpenAI" },
];
const fields = (r: (typeof rows)[number]) => [r.name, r.label];

describe("filterByText", () => {
	it("returns the same list for a blank query", () => {
		expect(filterByText(rows, "  ", fields)).toBe(rows);
	});
	it("matches any field, trimmed and case-insensitive", () => {
		expect(filterByText(rows, " OPEN ", fields)).toEqual([rows[1]]);
		expect(filterByText(rows, "zzz", fields)).toEqual([]);
	});
});
