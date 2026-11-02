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

/** The list with the item at `index` swapped one step toward `delta`'s side. */
export function moveItem<T>(
	list: readonly T[],
	index: number,
	delta: -1 | 1,
): T[] {
	const target = index + delta;
	if (index < 0 || index >= list.length || target < 0 || target >= list.length)
		return [...list];
	const next = [...list];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}
