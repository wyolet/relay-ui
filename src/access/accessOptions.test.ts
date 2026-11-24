import { describe, expect, it } from "bun:test";
import {
	accessPrefill,
	keylessHostIds,
	offeredAccounts,
} from "@/access/accessOptions";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { Pool } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import type { Policy } from "@/api/types/policy";

function account(id: string, hostId = "anthropic"): AgentAccount {
	return {
		id,
		label: id,
		hostId,
		hostLabel: hostId,
		needsShare: false,
	};
}

function host(id: string, noAuth = false): Host {
	return {
		metadata: { id, name: id },
		spec: { baseURL: "", ...(noAuth ? { noAuth } : {}) },
	};
}

function pool(id: string, spec: Partial<Pool["spec"]> = {}): Pool {
	return {
		metadata: { id, name: id, displayName: `${id} pool` },
		spec: { hostId: "anthropic", ...spec },
	};
}

function policy(spec: Policy["spec"]): Policy {
	return { metadata: { id: "p1", name: "p1" }, spec };
}

const hostLabel = (id: string) => `host ${id}`;
const keyless = new Set(["ollama"]);

describe("offeredAccounts", () => {
	it("leaves out accounts at a host that takes no key", () => {
		const hosts = [host("anthropic"), host("ollama", true)];
		const rows = offeredAccounts(
			[account("a"), account("o", "ollama")],
			keylessHostIds(hosts),
		);
		expect(rows.map((r) => r.id)).toEqual(["a"]);
	});
});

describe("accessPrefill", () => {
	it("starts on every credential with no policy", () => {
		expect(accessPrefill(undefined, [], [], hostLabel, keyless)).toEqual({
			everyCredential: true,
			accountIds: [],
			keptPools: [],
			representedPools: [],
			models: [],
		});
	});

	it("starts on every credential when the policy links no pools", () => {
		const prefill = accessPrefill(
			policy({ models: ["anthropic"] }),
			[],
			[],
			hostLabel,
			keyless,
		);
		expect(prefill.everyCredential).toBe(true);
		expect(prefill.models).toEqual(["anthropic"]);
	});

	it("ticks the accounts of a pool listing only offered accounts, in pool order", () => {
		const prefill = accessPrefill(
			policy({ poolIds: ["pool-a"] }),
			[pool("pool-a", { accountIds: ["b", "a"] })],
			[account("a"), account("b")],
			hostLabel,
			keyless,
		);
		expect(prefill).toMatchObject({
			everyCredential: false,
			accountIds: ["b", "a"],
			keptPools: [],
			representedPools: [
				{ id: "pool-a", hostId: "anthropic", accountIds: ["b", "a"] },
			],
		});
	});

	it("keeps every other pool whole, in the policy's order", () => {
		const prefill = accessPrefill(
			policy({
				poolIds: ["keys", "keyless", "foreign", "unseen", "mine"],
			}),
			[
				pool("keys", { accountIds: ["a"], credentialIds: ["k1"] }),
				pool("keyless", { hostId: "ollama" }),
				pool("foreign", { accountIds: ["a", "elsewhere"] }),
				pool("mine", { accountIds: ["a"] }),
			],
			[account("a")],
			hostLabel,
			keyless,
		);
		expect(prefill.accountIds).toEqual(["a"]);
		expect(prefill.representedPools.map((p) => p.id)).toEqual(["mine"]);
		expect(prefill.keptPools).toEqual([
			{
				id: "keys",
				label: "keys pool",
				hint: "Lists single keys at host anthropic.",
				hostId: "anthropic",
			},
			{
				id: "keyless",
				label: "keyless pool",
				hint: "At host ollama, a host that takes no key.",
				hostId: "ollama",
			},
			{
				id: "foreign",
				label: "foreign pool",
				hint: "Lists accounts at host anthropic this form can't offer.",
				hostId: "anthropic",
			},
			{ id: "unseen", label: "Pool unseen", hint: "A pool you can't see." },
		]);
	});
});
