import { describe, expect, it } from "bun:test";
import { plannedGroups, rowKindLabel } from "@/pseudo/dryRun";

const row = (kind: string) => ({ kind, id: `${kind}-1`, name: kind });

describe("plannedGroups", () => {
	it("keeps the non-empty lists in made, changed, deleted order", () => {
		expect(
			plannedGroups({
				deleted: [row("pool")],
				created: [row("policy")],
				updated: [],
			}),
		).toEqual([
			{ heading: "Makes", rows: [row("policy")] },
			{ heading: "Deletes", rows: [row("pool")] },
		]);
	});

	it("has no group for an answer that writes nothing", () => {
		expect(plannedGroups({ created: null })).toEqual([]);
	});
});

describe("rowKindLabel", () => {
	it("reads each kind a one-request write touches in sentence case", () => {
		expect(
			[
				"service-account",
				"account",
				"share",
				"pool",
				"policy",
				"policy-binding",
				"key",
				"host-key",
				"budget",
				"rate-limit",
			].map(rowKindLabel),
		).toEqual([
			"Service account",
			"Account",
			"Share",
			"Pool",
			"Policy",
			"Policy binding",
			"Key",
			"Host key",
			"Budget",
			"Rate limit",
		]);
	});

	it("keeps a kind it doesn't know as relay sent it", () => {
		expect(rowKindLabel("team")).toBe("team");
	});
});
