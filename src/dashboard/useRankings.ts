import {
	resolveWindow,
	type UsageGroupBy,
	type UsageGroupStat,
	useUsageOverview,
} from "@/api/hooks/usage";
import type { TrackRow } from "@/shared/TrackBars";
import { fmtCompact, fmtMoneyCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";

const LIMIT = 5;

function detail(g: UsageGroupStat): string {
	const parts = [`${fmtCompact(g.requests)} requests`];
	if (g.errorCount > 0) parts.push(`${fmtPct(g.errorRate)} failed`);
	parts.push(`${fmtCompact(g.tokens)} tokens`);
	if (g.cost.usd != null)
		parts.push(`${fmtMoneyCompact(g.cost.usd, "USD")} est.`);
	return parts.join(" · ");
}

/** The top spenders in one dimension this week; the biggest in the accent.
 * Groups with no priced traffic rank last. */
export function useSpendRanking(groupBy: UsageGroupBy): TrackRow[] {
	const { groups } = useUsageOverview(groupBy, resolveWindow("week"));
	const labelFor = useGroupLabeler(groupBy);
	return [...groups]
		.sort((a, b) => (b.cost.usd ?? -1) - (a.cost.usd ?? -1))
		.slice(0, LIMIT)
		.map((g, i) => ({
			key: g.key,
			label: labelFor(g.key) || "Unassigned",
			value: g.cost.usd ?? 0,
			display: g.cost.usd != null ? fmtMoneyCompact(g.cost.usd, "USD") : "—",
			color: i === 0 ? "var(--chart-1)" : undefined,
			detail: detail(g),
		}));
}

/** The keys that sent the most requests this week. */
export function useTopKeys(): TrackRow[] {
	const { groups } = useUsageOverview("relay_key_hash", resolveWindow("week"));
	const labelFor = useGroupLabeler("relay_key_hash");
	return groups.slice(0, LIMIT).map((g, i) => ({
		key: g.key,
		label: labelFor(g.key),
		value: g.requests,
		display: fmtCompact(g.requests),
		color: i === 0 ? "var(--chart-1)" : undefined,
		detail: detail(g),
	}));
}
