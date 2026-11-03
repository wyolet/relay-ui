import { describe, expect, it } from "bun:test";
import type { Pool } from "@/api/hooks/pools";
import { ApiError } from "@/api/types/errors";
import {
	type KeyCreateEffects,
	keyCreatePlan,
	keyPoolChoices,
	poolFailureMessage,
	poolWithKey,
	runKeyCreate,
} from "./keyCreate";

const pool = (
	id: string,
	hostId: string,
	spec: Partial<Pool["spec"]> = {},
): Pool => ({
	metadata: { id, name: id, resourceVersion: "7" },
	spec: { hostId, ...spec },
});

const apiError = (status: number, code: string, message: string) =>
	new ApiError(status, { type: "invalid_request_error", code, message });

const pools = [
	pool("p-plain", "h1", { credentialIds: ["k1"] }),
	pool("p-acct", "h1", { accountIds: ["a1"] }),
	pool("p-other-host", "h2"),
];

describe("keyPoolChoices", () => {
	it("offers the host's pools and marks those that list the account", () => {
		expect(keyPoolChoices(pools, "h1", "a1")).toEqual([
			{ id: "p-plain", label: "p-plain", implied: false },
			{ id: "p-acct", label: "p-acct", implied: true },
		]);
	});
});

describe("poolWithKey", () => {
	it("appends the key and keeps the loaded version", () => {
		const next = poolWithKey(pools[0], "k2");
		expect(next.spec.credentialIds).toEqual(["k1", "k2"]);
		expect(next.metadata.resourceVersion).toBe("7");
	});

	it("doesn't list a key twice", () => {
		expect(poolWithKey(pools[0], "k1").spec.credentialIds).toEqual(["k1"]);
	});
});

describe("keyCreatePlan", () => {
	const choices = keyPoolChoices(pools, "h1", "a1");
	it("joins the picked account and skips implied or unknown pools", () => {
		expect(
			keyCreatePlan(
				{ accountId: "a1", poolIds: ["p-plain", "p-acct", "gone"] },
				choices,
			),
		).toEqual({
			accountId: "a1",
			poolIds: ["p-plain"],
		});
	});
});

type Key = { metadata: { id?: string } };

function effects(overrides: Partial<KeyCreateEffects<Key>> = {}) {
	const calls: string[] = [];
	const base: KeyCreateEffects<Key> = {
		createKey: async (accountId) => {
			calls.push(`key:${accountId ?? ""}`);
			return { metadata: { id: "k-new" } };
		},
		addKeyToPool: async (poolId, keyId) => {
			calls.push(`pool:${poolId}:${keyId}`);
		},
	};
	return { calls, effects: { ...base, ...overrides } };
}

describe("runKeyCreate", () => {
	it("creates the key in the account, then each pool", async () => {
		const { calls, effects: fx } = effects();
		const out = await runKeyCreate(
			{ accountId: "a1", poolIds: ["p1", "p2"] },
			fx,
		);
		expect(calls).toEqual(["key:a1", "pool:p1:k-new", "pool:p2:k-new"]);
		expect(out.poolFailures).toEqual([]);
	});

	it("rethrows a failed key and touches no pool", async () => {
		const { calls, effects: fx } = effects({
			createKey: async () => {
				throw new Error("bad key");
			},
		});
		await expect(
			runKeyCreate({ accountId: "a1", poolIds: ["p1"] }, fx),
		).rejects.toThrow("bad key");
		expect(calls).toEqual([]);
	});

	it("collects a failed pool and still updates the rest", async () => {
		const conflict = apiError(409, "conflict", "busy");
		const { calls, effects: fx } = effects({
			addKeyToPool: async (poolId, keyId) => {
				if (poolId === "p1") throw conflict;
				calls.push(`pool:${poolId}:${keyId}`);
			},
		});
		const out = await runKeyCreate(
			{ accountId: "a1", poolIds: ["p1", "p2"] },
			fx,
		);
		expect(calls).toEqual(["key:a1", "pool:p2:k-new"]);
		expect(out.poolFailures).toEqual([{ poolId: "p1", error: conflict }]);
	});
});

describe("poolFailureMessage", () => {
	it("names the pool and the server's reason", () => {
		expect(
			poolFailureMessage("Primary", apiError(403, "forbidden", "not yours")),
		).toBe('Key created, but adding it to pool "Primary" failed: not yours');
	});

	it("explains a stale version", () => {
		expect(
			poolFailureMessage(
				"Primary",
				apiError(409, "stale_resource_version", "x"),
			),
		).toContain("changed since this form loaded it");
	});
});
