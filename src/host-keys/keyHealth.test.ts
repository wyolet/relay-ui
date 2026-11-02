import { describe, expect, test } from "bun:test";
import { keyHealthView } from "@/host-keys/keyHealth";

describe("keyHealthView", () => {
	test("reads as checking until the call answers", () => {
		expect(keyHealthView(undefined).label).toBe("Checking");
		expect(keyHealthView(undefined, true).label).toBe("Unknown");
	});
	test("a closed breaker is healthy", () => {
		expect(
			keyHealthView({ state: "closed", backoff_step: 0, has_record: false }),
		).toEqual({ label: "Healthy", tone: "ok", detail: undefined });
	});
	test("an open breaker with no expiry fails until rotated", () => {
		const view = keyHealthView({
			state: "open",
			backoff_step: 0,
			has_record: true,
			indefinite: true,
			reason: "auth",
		});
		expect(view).toEqual({ label: "Failing", tone: "alert", detail: "auth" });
	});
	test("a timed open breaker cools down", () => {
		expect(
			keyHealthView({ state: "open", backoff_step: 2, has_record: true }).label,
		).toBe("Cooling down");
	});
	test("half-open recovers", () => {
		expect(
			keyHealthView({ state: "half_open", backoff_step: 1, has_record: true })
				.tone,
		).toBe("warn");
	});
});
