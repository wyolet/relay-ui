import { describe, expect, test } from "bun:test";
import {
	advanceInterval,
	comparisonWindows,
	floorToInterval,
	rollingWindow,
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
