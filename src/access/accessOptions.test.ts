import { describe, expect, it } from "bun:test";
import {
	accessPrefill,
	currentAccessPrefill,
	hiddenPoolsLine,
} from "@/access/accessOptions";
import type { AgentAccount, AgentPool } from "@/agents/agentAccounts";
import type { Pool } from "@/api/hooks/pools";
import type { CurrentPool, PolicyCurrent } from "@/api/hooks/pseudoAccess";
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

function currentPool(
	id: string,
	over: Partial<CurrentPool> = {},
	hostId = "anthropic",
): CurrentPool {
	return {
		id,
		name: id,
		host: { id: hostId, name: hostId },
		accounts: [],
		hiddenAccounts: 0,
		labelled: true,
		...over,
	};
}

function current(over: Partial<PolicyCurrent> = {}): PolicyCurrent {
	return {
		policy: { id: "p1", name: "p1" },
		pools: [],
		hiddenPools: 0,
		models: [],
		linksNoPools: false,
		...over,
	};
}

const refs = (...ids: string[]) => ids.map((id) => ({ id, name: id }));
const ollamaPool: AgentPool = {
	id: "pool-ollama",
	label: "Ollama",
	hostId: "ollama",
	hostLabel: "Ollama",
};

describe("currentAccessPrefill", () => {
	it("starts on every credential under no policy", () => {
		expect(currentAccessPrefill(undefined, [], [], hostLabel, keyless)).toEqual(
			{
				everyCredential: true,
				accountIds: [],
				keptPools: [],
				representedPools: [],
				models: [],
				poolIds: [],
				currentPoolIds: [],
				hiddenPools: 0,
			},
		);
	});

	it("reads a policy linking no pools as every credential with its models", () => {
		const prefill = currentAccessPrefill(
			current({ linksNoPools: true, models: ["google"] }),
			[],
			[],
			hostLabel,
			keyless,
		);
		expect(prefill.everyCredential).toBe(true);
		expect(prefill.models).toEqual(["google"]);
	});

	it("ticks offered keyless pools and the accounts of labelled pools", () => {
		const prefill = currentAccessPrefill(
			current({
				pools: [
					currentPool("pool-ollama", {}, "ollama"),
					currentPool("pool-a", { accounts: refs("b", "a") }),
				],
				hiddenPools: 2,
			}),
			[account("a"), account("b")],
			[ollamaPool],
			hostLabel,
			keyless,
		);
		expect(prefill).toEqual({
			everyCredential: false,
			accountIds: ["b", "a"],
			keptPools: [],
			representedPools: [
				{ id: "pool-a", hostId: "anthropic", accountIds: ["b", "a"] },
			],
			models: [],
			poolIds: ["pool-ollama"],
			currentPoolIds: ["pool-ollama", "pool-a"],
			hiddenPools: 2,
		});
	});

	it("keeps whole the pools it can't stand for by accounts", () => {
		const prefill = currentAccessPrefill(
			current({
				pools: [
					currentPool("hidden", { accounts: refs("a"), hiddenAccounts: 1 }),
					currentPool("empty"),
					currentPool("other", { accounts: refs("a"), labelled: false }),
					currentPool("foreign", { accounts: refs("a", "elsewhere") }),
					currentPool("unoffered-keyless", {}, "ollama"),
				],
			}),
			[account("a")],
			[],
			hostLabel,
			keyless,
		);
		expect(prefill.accountIds).toEqual([]);
		expect(prefill.keptPools).toEqual([
			{
				id: "hidden",
				label: "hidden",
				hint: "Lists accounts at host anthropic you can't see.",
				hostId: "anthropic",
			},
			{
				id: "empty",
				label: "empty",
				hint: "Lists no accounts at host anthropic.",
				hostId: "anthropic",
			},
			{
				id: "other",
				label: "other",
				hint: "A pool at host anthropic this form didn't make.",
				hostId: "anthropic",
			},
			{
				id: "foreign",
				label: "foreign",
				hint: "Lists accounts at host anthropic this form can't offer.",
				hostId: "anthropic",
			},
			{
				id: "unoffered-keyless",
				label: "unoffered-keyless",
				hint: "At host ollama, a host that takes no key.",
				hostId: "ollama",
			},
		]);
	});
});

describe("hiddenPoolsLine", () => {
	it("counts the pools an admin set, none for zero", () => {
		expect(hiddenPoolsLine(0)).toBeUndefined();
		expect(hiddenPoolsLine(undefined)).toBeUndefined();
		expect(hiddenPoolsLine(1)).toBe("1 more pool set by an admin stays.");
		expect(hiddenPoolsLine(3)).toBe("3 more pools set by an admin stay.");
	});
});
