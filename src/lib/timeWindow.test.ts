import { describe, expect, test } from "bun:test";
import {
	parseDurationSeconds,
	windowLabel,
	windowShort,
} from "@/lib/timeWindow";

describe("windowShort", () => {
	test("presets render as a single unit", () => {
		expect(windowShort(1)).toBe("1s");
		expect(windowShort(60)).toBe("1m");
		expect(windowShort(3600)).toBe("1h");
		expect(windowShort(86_400)).toBe("1d");
		expect(windowShort(300)).toBe("5m");
		expect(windowShort(172_800)).toBe("2d");
	});

	test("non-preset values floor into a two-unit compound, never round up", () => {
		// Regression: 90s used to render as "2m", overstating the window.
		expect(windowShort(90)).toBe("1m30s");
		expect(windowShort(5400)).toBe("1h30m");
		expect(windowShort(90_000)).toBe("1d1h");
	});

	test("keeps at most the two most significant units", () => {
		expect(windowShort(3661)).toBe("1h1m"); // drops the trailing 1s
		expect(windowShort(86_461)).toBe("1d1m"); // 0h skipped, 1s dropped
	});

	test("degenerate input", () => {
		expect(windowShort(0)).toBe("0s");
		expect(windowShort(-5)).toBe("0s");
	});
});

describe("windowLabel", () => {
	test("preset and free-form", () => {
		expect(windowLabel(60)).toBe("Per minute");
		expect(windowLabel(90)).toBe("Every 90s");
	});
});

describe("parseDurationSeconds", () => {
	test("Go duration forms", () => {
		expect(parseDurationSeconds("1m0s")).toBe(60);
		expect(parseDurationSeconds("24h0m0s")).toBe(86_400);
		expect(parseDurationSeconds("1s")).toBe(1);
		expect(parseDurationSeconds("500ms")).toBe(1); // rounds to whole seconds
	});
});
