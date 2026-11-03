import { expect, test } from "bun:test";
import type { Pool } from "@/api/hooks/pools";
import type { HostKey } from "@/api/types/hostkey";
import {
	POOL_SELECTIONS,
	poolHoldsKey,
	poolMemberSummary,
	SELECTION_LABELS,
} from "@/pools/poolKeys";

test("every selection has a label", () => {
	for (const s of POOL_SELECTIONS)
		expect(SELECTION_LABELS[s].label).toBeTruthy();
});

const makePool = (o: {
	accountIds?: string[];
	credentialIds?: string[];
}): Pool => ({
	metadata: { id: "p", name: "p" },
	spec: { hostId: "h", ...o },
});

test("summarises a pool's accounts and keys", () => {
	expect(
		poolMemberSummary(
			makePool({ accountIds: ["a"], credentialIds: ["k1", "k2"] }),
		),
	).toBe("1 account · 2 keys");
	expect(poolMemberSummary(makePool({}))).toBe("No members");
});

test("a pool holds a key listed itself or through its account", () => {
	const key: HostKey = {
		metadata: { id: "k", name: "k" },
		spec: { hostId: "h", accountId: "a", valueFrom: { kind: "stored" } },
	};
	expect(poolHoldsKey(makePool({ accountIds: ["a"] }), key)).toBe(true);
	expect(poolHoldsKey(makePool({ credentialIds: ["k"] }), key)).toBe(true);
	expect(poolHoldsKey(makePool({ accountIds: ["b"] }), key)).toBe(false);
});
