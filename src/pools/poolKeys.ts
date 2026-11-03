import type { PoolSpec } from "@/api/hooks/pools";

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
