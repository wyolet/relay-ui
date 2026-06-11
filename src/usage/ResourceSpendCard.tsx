import { type CostResourceDimension, useResourceSpend } from "@/api/hooks/cost";
import { UsageCard } from "@/shared/ResourceUsageCards";
import { fmtCompact, fmtMoneyCompact } from "./format";

/**
 * One resource's estimated spend, matching the ResourceUsageCards tile row.
 * Mount behind its own Suspense so it never blocks the instant cards beside
 * it. Cost is server-stamped per event, so the figure is exact for every
 * dimension — including policy and key scopes.
 */
export function ResourceSpendCard({
	dimension,
	id,
}: {
	dimension: CostResourceDimension;
	id: string;
}) {
	const { sum } = useResourceSpend(dimension, id);
	const unpricedSub =
		sum.unpricedEvents > 0
			? `${fmtCompact(sum.unpricedEvents)} req unpriced`
			: undefined;

	if (sum.usd == null) {
		return <UsageCard label="Est. spend · 1h" value="—" sub={unpricedSub} />;
	}

	return (
		<UsageCard
			label="Est. spend · 1h"
			value={`≈${fmtMoneyCompact(sum.usd, "USD")}`}
			sub={unpricedSub}
			mono
		/>
	);
}

/** Suspense fallback matching the tile row. */
export function ResourceSpendCardSkeleton() {
	return <UsageCard label="Est. spend · 1h" value="…" />;
}
