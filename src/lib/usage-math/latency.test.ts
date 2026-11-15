import { describe, expect, test } from "bun:test";
import { latencyLadder, slowestGroup } from "@/lib/usage-math/latency";

describe("latencyLadder", () => {
	test("orders p50 → p99 with shares relative to p99, leaving max out", () => {
		const ladder = latencyLadder({
			avg: 400,
			p50: 300,
			p95: 1400,
			p99: 2800,
			max: 392_800,
		});
		expect(ladder.map((r) => r.label)).toEqual(["p50", "p95", "p99"]);
		expect(ladder[2].share).toBe(1);
		expect(ladder[0].share).toBeCloseTo(300 / 2800);
	});

	test("all-zero stats → zero shares, no NaN", () => {
		const ladder = latencyLadder({ avg: 0, p50: 0, p95: 0, p99: 0, max: 0 });
		for (const rung of ladder) {
			expect(rung.share).toBe(0);
		}
	});
});

describe("slowestGroup", () => {
	test("picks the highest p95 among groups with real traffic", () => {
		const groups = [
			{ key: "busy", requests: 900, p95: 4000 },
			{ key: "slow", requests: 50, p95: 9000 },
			{ key: "one-off", requests: 2, p95: 60_000 },
		];
		expect(slowestGroup(groups)?.key).toBe("slow");
	});

	test("is null without traffic", () => {
		expect(slowestGroup([])).toBeNull();
		expect(slowestGroup([{ key: "a", requests: 5, p95: 0 }])).toBeNull();
	});
});
