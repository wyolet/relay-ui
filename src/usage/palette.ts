/**
 * Shared color ramp for usage visualizations. The stacked chart, its legend,
 * and the "Top by" leaderboard all map a group's volume rank to the same color,
 * so a given model/host reads as the same hue across all three. Ranks beyond the
 * ramp fold to the muted "Others" tone — mirroring how the chart buckets the
 * long tail into a single "Others" series.
 *
 * Keep the length in sync with `MAX_SERIES` in `@/api/hooks/usage` (the chart
 * keeps that many distinct series before folding the rest into Others).
 */
export const USAGE_PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--color-brand-300)",
] as const;

/** Tone for the folded long tail / un-ranked rows. */
export const OTHER_COLOR = "var(--muted-foreground)";

/** Color for a series or leaderboard row by its 0-based volume rank. */
export function rankColor(rank: number): string {
	return rank >= 0 && rank < USAGE_PALETTE.length
		? USAGE_PALETTE[rank]
		: OTHER_COLOR;
}
