import type { Pool, PoolSpec } from "@/api/hooks/pools";
import type { HostKey } from "@/api/types/hostkey";

export type PoolSelection = NonNullable<PoolSpec["selection"]>;

export const POOL_SELECTIONS = [
	"prioritized",
	"round-robin",
	"least-recently-used",
] as const satisfies readonly PoolSelection[];

export const SELECTION_LABELS: Record<
	PoolSelection,
	{ label: string; hint: string }
> = {
	prioritized: {
		label: "Prioritized",
		hint: "Takes the first healthy key in order.",
	},
	"round-robin": { label: "Round-robin", hint: "Rotates through the keys." },
	"least-recently-used": {
		label: "Least recently used",
		hint: "Takes the key idle longest.",
	},
};


/** A pool's members in a few words: "2 accounts · 1 key", or "No members". */
export function poolMemberSummary(pool: Pool): string {
	const accounts = pool.spec.accountIds?.length ?? 0;
	const keys = pool.spec.credentialIds?.length ?? 0;
	const parts = [
		accounts > 0 ? `${accounts} account${accounts === 1 ? "" : "s"}` : "",
		keys > 0 ? `${keys} key${keys === 1 ? "" : "s"}` : "",
	].filter(Boolean);
	return parts.length > 0 ? parts.join(" · ") : "No members";
}

/** Whether a pool draws on a key: listed itself, or through its account. */
export function poolHoldsKey(pool: Pool, hk: HostKey): boolean {
	const id = hk.metadata.id ?? "";
	const accountId = hk.spec.accountId;
	return (
		(pool.spec.credentialIds ?? []).includes(id) ||
		(accountId !== undefined &&
			(pool.spec.accountIds ?? []).includes(accountId))
	);
}
