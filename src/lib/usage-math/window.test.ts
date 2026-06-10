import { describe, expect, test } from "bun:test";
import { comparisonWindows } from "@/lib/usage-math/window";

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
