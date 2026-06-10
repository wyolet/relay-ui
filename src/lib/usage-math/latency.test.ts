import { describe, expect, test } from "bun:test";
import { latencyLadder } from "@/lib/usage-math/latency";

describe("latencyLadder", () => {
	test("orders p50 → max with shares relative to the peak", () => {
		const ladder = latencyLadder({
			avg: 400,
			p50: 300,
			p95: 1400,
			p99: 2800,
			max: 4100,
		});
		expect(ladder.map((r) => r.label)).toEqual(["p50", "p95", "p99", "max"]);
		expect(ladder[3].share).toBe(1);
		expect(ladder[0].share).toBeCloseTo(300 / 4100);
	});

	test("all-zero stats → zero shares, no NaN", () => {
		const ladder = latencyLadder({ avg: 0, p50: 0, p95: 0, p99: 0, max: 0 });
		for (const rung of ladder) {
			expect(rung.share).toBe(0);
		}
	});
});
