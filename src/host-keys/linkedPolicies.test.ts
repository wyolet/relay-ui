import { describe, expect, it } from "bun:test";
import type { Pool } from "@/api/hooks/pools";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { linkedPolicyRows } from "./linkedPolicies";

const hk: HostKey = {
	metadata: { id: "hk-1", name: "hk-1" },
	spec: { hostId: "h1", valueFrom: { kind: "stored" } },
	policies: [
		{ id: "p-both", name: "both" },
		{ id: "p-pool", name: "pooled" },
		{ id: "p-gone", name: "gone" },
	],
};

const policies: Policy[] = [
	{
		metadata: { id: "p-both", name: "both", displayName: "Both" },
		spec: { poolIds: ["pool-2", "pool-1", "pool-empty"] },
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
	{
		metadata: { id: "pool-2", name: "spare-pool" },
		spec: { hostId: "h1", credentialIds: ["hk-1"] },
	},
	{
		metadata: { id: "pool-empty", name: "empty-pool" },
		spec: { hostId: "h1", credentialIds: [] },
	},
];

describe("linkedPolicyRows", () => {
	const rows = linkedPolicyRows(hk, policies, pools);

	it("names the pools that hold the key, in the policy's failover order", () => {
		expect(rows.map((r) => r.viaPools)).toEqual([
			[
				{ name: "spare-pool", label: "spare-pool" },
				{ name: "main-pool", label: "Main pool" },
			],
			[{ name: "main-pool", label: "Main pool" }],
			[],
		]);
	});

	it("labels from the policy list, falling back to the slug", () => {
		expect(rows.map((r) => r.label)).toEqual(["Both", "pooled", "gone"]);
		expect(rows[1]?.enabled).toBe(false);
	});
});
