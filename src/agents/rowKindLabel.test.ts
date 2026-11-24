import { describe, expect, it } from "bun:test";
import { rowKindLabel } from "@/agents/rowKindLabel";

describe("rowKindLabel", () => {
	it("reads each kind an agent makes in sentence case", () => {
		expect(
			[
				"service-account",
				"account",
				"share",
				"pool",
				"policy",
				"policy-binding",
				"key",
			].map(rowKindLabel),
		).toEqual([
			"Service account",
			"Account",
			"Share",
			"Pool",
			"Policy",
			"Policy binding",
			"Key",
		]);
	});

	it("keeps a kind it doesn't know as relay sent it", () => {
		expect(rowKindLabel("rate-limit")).toBe("rate-limit");
	});
});
