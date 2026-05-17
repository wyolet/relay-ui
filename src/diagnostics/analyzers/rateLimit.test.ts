import { describe, expect, it } from "bun:test";
import { analyzeRateLimit } from "@/diagnostics/analyzers/rateLimit";
import { graph, makePolicy, makeRateLimit } from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeRateLimit", () => {
	it("warns when disabled and an enabled policy references it", () => {
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const p = makePolicy({ id: "p1", rateLimitId: "rl1" });
		const ds = analyzeRateLimit(rl, graph({ rateLimits: [rl], policies: [p] }));
		expect(codes(ds)).toContain("rate-limit.disabled-with-refs");
	});

	it("doesn't fire disabled-with-refs if only disabled policies reference it", () => {
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const p = makePolicy({
			id: "p1",
			rateLimitId: "rl1",
			enabled: false,
		});
		const ds = analyzeRateLimit(rl, graph({ rateLimits: [rl], policies: [p] }));
		expect(codes(ds)).not.toContain("rate-limit.disabled-with-refs");
	});

	it("info: orphan when no policy references it", () => {
		const rl = makeRateLimit({ id: "rl1" });
		const ds = analyzeRateLimit(rl, graph({ rateLimits: [rl] }));
		expect(codes(ds)).toContain("rate-limit.orphan");
	});

	it("info: disabled", () => {
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const ds = analyzeRateLimit(rl, graph({ rateLimits: [rl] }));
		expect(codes(ds)).toContain("rate-limit.disabled");
	});
});
