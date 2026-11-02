import { describe, expect, it } from "bun:test";
import type { Pool } from "@/api/hooks/pools";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { linkedPolicyRows } from "./linkedPolicies";

const hk: HostKey = {
	metadata: { id: "hk-1", name: "hk-1" },
	spec: { hostId: "h1", valueFrom: { kind: "stored" } },
	policies: [
		{ id: "p-direct", name: "direct" },
		{ id: "p-pool", name: "pooled" },
		{ id: "p-gone", name: "gone" },
	],
};

const policies: Policy[] = [
	{
		metadata: { id: "p-direct", name: "direct", displayName: "Direct" },
		spec: { credentialIds: ["hk-1"] },
	},
	{
		metadata: { id: "p-pool", name: "pooled" },
		spec: { poolIds: ["pool-1"], enabled: false },
	},
];

const pools: Pool[] = [
	{
		metadata: { id: "pool-1", name: "main-pool", displayName: "Main pool" },
		spec: { hostId: "h1", credentialIds: ["hk-1"] },
	},
];

describe("linkedPolicyRows", () => {
	const rows = linkedPolicyRows(hk, policies, pools);

	it("names the pools that hold the key", () => {
		expect(rows.map((r) => r.viaPools)).toEqual([
			[],
			[{ name: "main-pool", label: "Main pool" }],
			[],
		]);
	});

	it("marks only credentialIds links as direct", () => {
		expect(rows.map((r) => [r.id, r.direct])).toEqual([
			["p-direct", true],
			["p-pool", false],
			["p-gone", false],
		]);
	});

	it("labels from the policy list, falling back to the slug", () => {
		expect(rows.map((r) => r.label)).toEqual(["Direct", "pooled", "gone"]);
		expect(rows[1]?.enabled).toBe(false);
	});
});
