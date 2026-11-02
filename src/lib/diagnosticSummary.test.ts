import { describe, expect, it } from "bun:test";
import type { Severity } from "@/diagnostics/types";
import { diagnosticSummary } from "./diagnosticSummary";

const of = (...severities: Severity[]) =>
	severities.map((severity) => ({ severity }));

describe("diagnosticSummary", () => {
	it("is empty with no diagnostics", () => {
		expect(diagnosticSummary([])).toBe("");
	});

	it("pluralizes errors and warnings, never info", () => {
		expect(diagnosticSummary(of("error", "warn", "info"))).toBe(
			"1 error · 1 warning · 1 info",
		);
		expect(
			diagnosticSummary(of("error", "error", "warn", "warn", "info", "info")),
		).toBe("2 errors · 2 warnings · 2 info");
	});

	it("skips severities with no diagnostics", () => {
		expect(diagnosticSummary(of("warn", "error", "warn"))).toBe(
			"1 error · 2 warnings",
		);
	});
});
