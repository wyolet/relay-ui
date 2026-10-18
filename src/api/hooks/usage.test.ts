import { describe, expect, test } from "bun:test";
import { previousRows, resolveWindow } from "@/api/hooks/usage";

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

describe("previousRows", () => {
	const stats = { avg: 1, max: 1, p50: 1, p95: 1, p99: 1 };
	const base = {
		group: { model_id: "m" },
		requests: 3,
		error_count: 0,
		errors_4xx: 0,
		errors_5xx: 0,
		throttled: 0,
		tokens: {},
		duration_ms: stats,
		cost_nanos: 0,
		unpriced: 0,
		first_seen: "",
		last_seen: "",
	};

	test("lifts each row's previous numbers into a row of the same group", () => {
		const rows = previousRows([
			{ ...base, previous: { ...base, requests: 2 } },
			{ ...base, group: { model_id: "new" } },
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.requests).toBe(2);
		expect(rows[0]?.group).toEqual({ model_id: "m" });
	});
});
