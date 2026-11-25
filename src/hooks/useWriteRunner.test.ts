import { describe, expect, it } from "bun:test";
import { ApiError } from "@/api/types/errors";
import { failureMessage, writeStatus } from "@/hooks/useWriteRunner";

describe("failureMessage", () => {
	it("reads relay's message, then the error's, then a fallback", () => {
		expect(
			failureMessage(new ApiError(403, { type: "forbidden", message: "no" })),
		).toBe("no");
		expect(failureMessage(new TypeError("Failed to fetch"))).toBe(
			"Failed to fetch",
		);
		expect(failureMessage(new ApiError(500, { type: "x", message: "" }))).toBe(
			"The request failed.",
		);
	});
});

describe("writeStatus", () => {
	it("marks the first unfinished write with the run's phase", () => {
		expect(writeStatus(0, 1, "failed")).toBe("done");
		expect(writeStatus(1, 1, "failed")).toBe("failed");
		expect(writeStatus(1, 1, "running")).toBe("running");
		expect(writeStatus(2, 1, "running")).toBe("waiting");
		expect(writeStatus(0, 0, "idle")).toBe("waiting");
	});
});
