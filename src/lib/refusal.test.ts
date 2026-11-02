import { describe, expect, test } from "bun:test";
import {
	isRefusal,
	REFUSALS,
	refusalCounts,
	refusalLabel,
	refusalReason,
} from "./refusal";

describe("refusal labels", () => {
	test("covers every refusal the relay sends", () => {
		expect([...REFUSALS]).toEqual([
			"model_not_allowed",
			"host_not_reachable",
			"no_capacity",
		]);
		for (const r of REFUSALS) {
			expect(refusalLabel(r)).not.toBe(r);
			expect(refusalReason(r)).not.toBe("");
		}
	});

	test("names a known value and passes an unknown one through", () => {
		expect(refusalLabel("no_capacity")).toBe("No capacity");
		expect(refusalLabel("some_future_refusal")).toBe("some_future_refusal");
	});

	test("isRefusal rejects inherited keys and unknown values", () => {
		expect(isRefusal("host_not_reachable")).toBe(true);
		expect(isRefusal("toString")).toBe(false);
		expect(isRefusal("")).toBe(false);
	});
});

describe("refusalCounts", () => {
	test("keeps non-zero refusals in a stable order", () => {
		expect(
			refusalCounts([
				{ group: { refusal: "" }, requests: 900 },
				{ group: { refusal: "no_capacity" }, requests: 34 },
				{ group: { refusal: "host_not_reachable" }, requests: 0 },
				{ group: { refusal: "model_not_allowed" }, requests: 2 },
				{ group: { refusal: "unknown" }, requests: 5 },
				{ requests: 7 },
			]),
		).toEqual([
			{ refusal: "model_not_allowed", requests: 2 },
			{ refusal: "no_capacity", requests: 34 },
		]);
	});
});
