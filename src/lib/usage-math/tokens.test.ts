import { describe, expect, test } from "bun:test";
import {
	classifyMeter,
	mergeMeters,
	splitTokens,
	type TokenKind,
} from "@/lib/usage-math/tokens";

describe("classifyMeter", () => {
	const cases: Array<[string, TokenKind]> = [
		["prompt", "input"],
		["prompt_tokens", "input"],
		["input", "input"],
		["cache_read", "input"],
		["cached_input", "input"],
		["completion", "output"],
		["completion_tokens", "output"],
		["output", "output"],
		["reasoning", "output"],
		["image", "other"],
		["audio_seconds", "other"],
	];
	for (const [meter, kind] of cases) {
		test(`${meter} → ${kind}`, () => {
			expect(classifyMeter(meter)).toBe(kind);
		});
	}
});

describe("mergeMeters", () => {
	test("sums per-meter across maps, skipping undefined", () => {
		expect(
			mergeMeters([
				{ prompt: 100, completion: 40 },
				undefined,
				{ prompt: 50, reasoning: 10 },
			]),
		).toEqual({ prompt: 150, completion: 40, reasoning: 10 });
	});
});

describe("splitTokens", () => {
	test("buckets by kind, totals add up, meters ranked", () => {
		const split = splitTokens({
			prompt: 1000,
			completion: 400,
			reasoning: 100,
			image: 5,
		});
		expect(split.input).toBe(1000);
		expect(split.output).toBe(500);
		expect(split.other).toBe(5);
		expect(split.total).toBe(1505);
		expect(split.meters.map((m) => m.meter)).toEqual([
			"prompt",
			"completion",
			"reasoning",
			"image",
		]);
	});

	test("empty map → all zeroes", () => {
		const split = splitTokens({});
		expect(split.total).toBe(0);
		expect(split.cached).toBe(0);
		expect(split.meters).toEqual([]);
	});

	test("cache meters count inside input and are tracked separately", () => {
		const split = splitTokens({
			input: 200,
			cache_read: 5000,
			cache_creation: 300,
			output: 50,
		});
		expect(split.input).toBe(5500);
		expect(split.cached).toBe(5300);
		// Raw prompt volume = input minus cache.
		expect(split.input - split.cached).toBe(200);
		expect(split.output).toBe(50);
	});
});
