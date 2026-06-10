import { describe, expect, test } from "bun:test";
import {
	breakerAttention,
	degradedHosts,
	rejectionBuckets,
	volumeLeaders,
} from "@/lib/usage-math/ops";

describe("volumeLeaders", () => {
	test("totals and ranks groups by volume, largest first", () => {
		const { total, top } = volumeLeaders(
			[
				{ group: { relay_key_hash: "aaa" }, requests: 3 },
				{ group: { relay_key_hash: "bbb" }, requests: 12 },
				{ group: { relay_key_hash: "ccc" }, requests: 7 },
			],
			"relay_key_hash",
		);
		expect(total).toBe(22);
		expect(top.map((g) => g.key)).toEqual(["bbb", "ccc", "aaa"]);
	});

	test("caps the leaderboard at limit but totals everything", () => {
		const rows = ["a", "b", "c", "d"].map((k, i) => ({
			group: { relay_key_hash: k },
			requests: i + 1,
		}));
		const { total, top } = volumeLeaders(rows, "relay_key_hash", 2);
		expect(total).toBe(10);
		expect(top).toHaveLength(2);
	});

	test("drops zero-count rows and falls back to a dash for blank keys", () => {
		const { total, top } = volumeLeaders(
			[
				{ group: { relay_key_hash: "  " }, requests: 5 },
				{ group: { relay_key_hash: "x" }, requests: 0 },
			],
			"relay_key_hash",
		);
		expect(total).toBe(5);
		expect(top).toEqual([{ key: "—", count: 5 }]);
	});

	test("empty input yields an empty summary", () => {
		expect(volumeLeaders([], "relay_key_hash")).toEqual({
			total: 0,
			top: [],
		});
	});
});

describe("rejectionBuckets", () => {
	test("derives the other-4xx remainder", () => {
		expect(rejectionBuckets(100, 60, 25)).toEqual({
			total: 100,
			throttled: 60,
			auth: 25,
			other: 15,
		});
	});

	test("clamps a negative remainder when counts drift across refetches", () => {
		expect(rejectionBuckets(10, 8, 5).other).toBe(0);
	});
});

describe("degradedHosts", () => {
	const host = (key: string, requests: number, errorCount: number) => ({
		key,
		requests,
		errorCount,
		errorRate: requests > 0 ? errorCount / requests : 0,
	});

	test("filters by both thresholds and sorts worst error rate first", () => {
		const out = degradedHosts(
			[
				host("low-volume", 5, 5), // 100% but under minRequests
				host("healthy", 1000, 2), // volume but fine
				host("bad", 100, 30), // 30%
				host("worse", 50, 25), // 50%
			],
			{ minRequests: 20, minErrorRate: 0.05 },
		);
		expect(out.map((h) => h.key)).toEqual(["worse", "bad"]);
	});

	test("boundary values at exactly the thresholds are included", () => {
		const out = degradedHosts([host("edge", 20, 1)], {
			minRequests: 20,
			minErrorRate: 0.05,
		});
		expect(out.map((h) => h.key)).toEqual(["edge"]);
	});
});

describe("breakerAttention", () => {
	const key = (
		id: string,
		state: string,
		indefinite = false,
	): Parameters<typeof breakerAttention>[0][number] => ({
		id,
		label: id,
		state,
		indefinite,
	});

	test("keeps only open/half_open, indefinite opens first", () => {
		const out = breakerAttention([
			key("healthy", "closed"),
			key("warming", "half_open"),
			key("never-failed", "unknown"),
			key("cooling", "open"),
			key("auth-dead", "open", true),
		]);
		expect(out.map((s) => s.id)).toEqual(["auth-dead", "cooling", "warming"]);
	});

	test("all healthy yields an empty list", () => {
		expect(breakerAttention([key("a", "closed")])).toEqual([]);
	});
});
