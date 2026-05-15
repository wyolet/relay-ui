import type { components } from "@/api/types.gen";

export type KeySelection = NonNullable<
	components["schemas"]["PolicySpec"]["keySelection"]
>;

export const KEY_SELECTION_VALUES: readonly KeySelection[] = [
	"prioritized",
	"round-robin",
	"least-recently-used",
] as const;

export const DEFAULT_KEY_SELECTION: KeySelection = "prioritized";

export const KEY_SELECTION_OPTIONS: Record<
	KeySelection,
	{ label: string; hint: string }
> = {
	prioritized: {
		label: "Prioritized",
		hint: "Drain the first healthy key in declaration order.",
	},
	"round-robin": {
		label: "Round-robin",
		hint: "Rotate evenly across healthy keys, one request per key.",
	},
	"least-recently-used": {
		label: "Least recently used",
		hint: "Pick whichever healthy key has been idle longest.",
	},
};
