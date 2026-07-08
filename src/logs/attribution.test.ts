import { describe, expect, it } from "bun:test";
import { failureAttribution } from "@/logs/attribution";

describe("failureAttribution", () => {
	it("returns null for successes", () => {
		expect(failureAttribution({ status: 200 })).toBeNull();
		expect(failureAttribution({ status: 200, error_kind: "" })).toBeNull();
	});

	it("attributes pass-through 4xx/5xx to the upstream", () => {
		const a = failureAttribution({ status: 401 });
		expect(a?.layer).toBe("upstream");
		expect(a?.reason).toContain("401");
		expect(failureAttribution({ status: 503 })?.layer).toBe("upstream");
	});

	it("attributes relay-minted verdicts by kind", () => {
		expect(
			failureAttribution({ status: 0, error_kind: "rate_limited" })?.layer,
		).toBe("relay");
		expect(
			failureAttribution({ status: 0, error_kind: "keys_exhausted" })?.layer,
		).toBe("relay");
		expect(
			failureAttribution({ status: 502, error_kind: "upstream_error" })?.layer,
		).toBe("upstream");
		expect(
			failureAttribution({ status: 0, error_kind: "upstream_unreachable" })
				?.layer,
		).toBe("upstream");
		expect(
			failureAttribution({ status: 0, error_kind: "client_canceled" })?.layer,
		).toBe("client");
		expect(
			failureAttribution({ status: 0, error_kind: "no_upstream_auth" })?.layer,
		).toBe("client");
	});

	it("falls back to relay for unknown kinds — the relay wrote the verdict", () => {
		expect(
			failureAttribution({ status: 0, error_kind: "some_future_kind" })?.layer,
		).toBe("relay");
	});

	it("prefers the kind over the status band when both are present", () => {
		// A relay-minted 429 must not read as upstream pass-through.
		expect(
			failureAttribution({ status: 429, error_kind: "rate_limited" })?.layer,
		).toBe("relay");
	});
});
