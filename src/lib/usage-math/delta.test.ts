import { describe, expect, test } from "bun:test";
import { compareValue } from "@/lib/usage-math/delta";

describe("compareValue", () => {
	test("growth", () => {
		const d = compareValue(150, 100);
		expect(d.delta).toBe(50);
		expect(d.ratio).toBe(0.5);
		expect(d.direction).toBe("up");
	});

	test("decline", () => {
		const d = compareValue(80, 100);
		expect(d.delta).toBe(-20);
		expect(d.ratio).toBe(-0.2);
		expect(d.direction).toBe("down");
	});

	test("flat", () => {
		const d = compareValue(100, 100);
		expect(d.delta).toBe(0);
		expect(d.ratio).toBe(0);
		expect(d.direction).toBe("flat");
	});

	test("no baseline: ratio is null, delta still absolute", () => {
		const d = compareValue(42, 0);
		expect(d.ratio).toBeNull();
		expect(d.delta).toBe(42);
		expect(d.direction).toBe("up");
	});

	test("rates compare in their own unit (percentage points)", () => {
		const d = compareValue(0.03, 0.01);
		expect(d.delta).toBeCloseTo(0.02);
		expect(d.ratio).toBeCloseTo(2);
	});
});
