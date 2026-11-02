import { describe, expect, it } from "bun:test";
import { fmtAgo, fmtDate, fmtTokens } from "./format";

describe("fmtTokens", () => {
	it("rounds to k; M gets one decimal unless exact", () => {
		expect([512, 8_192, 200_000, 1_000_000, 1_048_576].map(fmtTokens)).toEqual([
			"512",
			"8k",
			"200k",
			"1M",
			"1.0M",
		]);
	});
});

describe("fmtDate", () => {
	it("passes unparseable input through", () => {
		expect(fmtDate("nope")).toBe("nope");
	});
});

describe("fmtAgo", () => {
	const now = Date.parse("2026-10-18T12:00:00Z");
	it("steps from minutes to hours to days", () => {
		expect(
			[
				"2026-10-18T11:59:40Z",
				"2026-10-18T11:55:00Z",
				"2026-10-18T09:00:00Z",
				"2026-10-15T12:00:00Z",
				"nope",
			].map((t) => fmtAgo(t, now)),
		).toEqual(["just now", "5m ago", "3h ago", "3d ago", "—"]);
	});
});
