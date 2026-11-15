import { describe, expect, test } from "bun:test";
import {
	advanceInterval,
	comparisonWindows,
	daySliceStarts,
	floorToInterval,
	rollingWindow,
	totalsBySlice,
} from "@/lib/usage-math/window";

describe("floorToInterval / advanceInterval", () => {
	test("floors to epoch-aligned bucket starts (UTC midnight for 1d)", () => {
		// Matches the relay's Bucketize: bucketStart = floor(unix/interval),
		// regardless of the viewer's timezone.
		const ts = Date.UTC(2026, 5, 10, 14, 37, 42);
		expect(floorToInterval(ts, "5m")).toBe(Date.UTC(2026, 5, 10, 14, 35));
		expect(floorToInterval(ts, "1h")).toBe(Date.UTC(2026, 5, 10, 14));
		expect(floorToInterval(ts, "1d")).toBe(Date.UTC(2026, 5, 10));
	});

	test("advances one bucket per call", () => {
		const start = Date.UTC(2026, 5, 10);
		expect(advanceInterval(start, "1d")).toBe(Date.UTC(2026, 5, 11));
		expect(advanceInterval(start, "1h")).toBe(Date.UTC(2026, 5, 10, 1));
		expect(advanceInterval(start, "5m")).toBe(Date.UTC(2026, 5, 10, 0, 5));
	});
});

describe("rollingWindow", () => {
	test("spans the trailing N hours ending at now", () => {
		expect(rollingWindow("2026-06-10T12:00:00.000Z", 24)).toEqual({
			from: "2026-06-09T12:00:00.000Z",
			to: "2026-06-10T12:00:00.000Z",
		});
	});

	test("unparsable now or non-positive hours degrade to an empty window", () => {
		expect(rollingWindow("not-a-date", 24)).toEqual({
			from: "not-a-date",
			to: "not-a-date",
		});
		expect(rollingWindow("2026-06-10T12:00:00.000Z", 0).from).toBe(
			rollingWindow("2026-06-10T12:00:00.000Z", 0).to,
		);
	});
});

describe("comparisonWindows", () => {
	test("mid-period: previous window truncates to the same elapsed portion", () => {
		// Week of Mon Jun 8 → Mon Jun 15, observed Wed Jun 10 noon.
		const { previous } = comparisonWindows(
			{ from: "2026-06-08T00:00:00.000Z", to: "2026-06-15T00:00:00.000Z" },
			"2026-06-10T12:00:00.000Z",
		);
		expect(previous.from).toBe("2026-06-01T00:00:00.000Z");
		expect(previous.to).toBe("2026-06-03T12:00:00.000Z");
	});

	test("completed period: previous window spans the full prior period", () => {
		const { previous } = comparisonWindows(
			{ from: "2026-06-08T00:00:00.000Z", to: "2026-06-15T00:00:00.000Z" },
			"2026-06-20T00:00:00.000Z",
		);
		expect(previous.from).toBe("2026-06-01T00:00:00.000Z");
		expect(previous.to).toBe("2026-06-08T00:00:00.000Z");
	});

	test("window entirely in the future: previous window is empty", () => {
		const { previous } = comparisonWindows(
			{ from: "2026-06-08T00:00:00.000Z", to: "2026-06-15T00:00:00.000Z" },
			"2026-06-01T00:00:00.000Z",
		);
		expect(previous.from).toBe("2026-06-01T00:00:00.000Z");
		expect(previous.to).toBe("2026-06-01T00:00:00.000Z");
	});

	test("current window is passed through untouched", () => {
		const win = {
			from: "2026-06-10T00:00:00.000Z",
			to: "2026-06-11T00:00:00.000Z",
		};
		expect(comparisonWindows(win, "2026-06-10T08:00:00.000Z").current).toBe(
			win,
		);
	});

	test("unparsable input degrades to an empty previous window", () => {
		const { previous } = comparisonWindows(
			{ from: "not-a-date", to: "2026-06-15T00:00:00.000Z" },
			"2026-06-10T00:00:00.000Z",
		);
		expect(previous.from).toBe(previous.to);
	});
});

describe("daySliceStarts", () => {
	test("rolling windows step 24h from `from`", () => {
		const win = rollingWindow("2026-06-10T03:15:00.000Z", 7 * 24);
		const starts = daySliceStarts(win, true);
		expect(starts).toHaveLength(7);
		expect(starts[0]).toBe(Date.parse(win.from));
		expect(starts[6]).toBe(Date.parse("2026-06-09T03:15:00.000Z"));
	});

	test("calendar windows start at local midnights", () => {
		const from = new Date(2026, 5, 8);
		const to = new Date(2026, 5, 15);
		const starts = daySliceStarts(
			{ from: from.toISOString(), to: to.toISOString() },
			false,
		);
		expect(starts).toHaveLength(7);
		expect(starts[1]).toBe(new Date(2026, 5, 9).getTime());
	});
});

describe("totalsBySlice", () => {
	const starts = [0, 10, 20];

	test("sums each value into the slice it falls in", () => {
		const totals = totalsBySlice(
			[
				{ at: -5, value: 1 },
				{ at: 3, value: 2 },
				{ at: 10, value: 4 },
				{ at: 25, value: 8 },
			],
			starts,
			30,
		);
		expect(totals).toEqual([3, 4, 8]);
	});

	test("slices after now are null", () => {
		expect(totalsBySlice([{ at: 5, value: 1 }], starts, 15)).toEqual([
			1,
			0,
			null,
		]);
	});

	test("takes a custom combine", () => {
		const totals = totalsBySlice(
			[
				{ at: 1, value: 3 },
				{ at: 2, value: 5 },
			],
			starts,
			30,
			Math.max,
		);
		expect(totals[0]).toBe(5);
	});
});
