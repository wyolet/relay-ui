import { describe, expect, test } from "bun:test";
import { resolveWindow } from "@/api/hooks/usage";

describe("resolveWindow", () => {
	test("custom range round-trips valid from/to", () => {
		const win = resolveWindow(
			"custom",
			"2026-06-01T00:00:00.000Z",
			"2026-06-08T00:00:00.000Z",
		);
		expect(win.from).toBe("2026-06-01T00:00:00.000Z");
		expect(win.to).toBe("2026-06-08T00:00:00.000Z");
	});

	test("malformed custom `from` falls back to a preset instead of throwing", () => {
		// Regression: new Date(Date.parse("abc")).toISOString() threw a
		// RangeError in the route loader, error-bounding the whole Usage page
		// on a hand-edited or truncated shared URL.
		const win = resolveWindow("custom", "abc");
		expect(Number.isNaN(Date.parse(win.from))).toBe(false);
		expect(Number.isNaN(Date.parse(win.to))).toBe(false);
	});

	test("malformed custom `to` still keeps a valid window", () => {
		const win = resolveWindow("custom", "2026-06-01T00:00:00.000Z", "garbage");
		expect(win.from).toBe("2026-06-01T00:00:00.000Z");
		expect(Number.isNaN(Date.parse(win.to))).toBe(false);
	});
});
