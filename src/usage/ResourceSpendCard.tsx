import { type CostResourceDimension, useResourceSpend } from "@/api/hooks/cost";
import { UsageCard } from "@/shared/ResourceUsageCards";
import { fmtCompact, fmtMoneyCompact } from "./format";

/**
 * One resource's estimated spend, matching the ResourceUsageCards tile row.
 * Mount behind its own Suspense — the cost fan-out must never block the
 * instant cards beside it. Exact attribution even for policy/key scopes,
 * since the resource filter combines with the per-host fan-out.
 */
export function ResourceSpendCard({
	dimension,
	id,
}: {
	dimension: CostResourceDimension;
	id: string;
}) {
	const { sum, hostsTruncated } = useResourceSpend(dimension, id);
	const dominant = sum.dominant;

	if (!dominant) {
		return (
			<UsageCard
				label="Est. spend · 1h"
				value="—"
				sub={
					sum.unpricedTokens > 0
						? `${fmtCompact(sum.unpricedTokens)} tok unpriced`
						: undefined
				}
			/>
		);
	}

	let sub: string | undefined;
	if (sum.mixed) sub = "+ other currencies";
	else if (sum.unpricedTokens > 0)
		sub = `${fmtCompact(sum.unpricedTokens)} tok unpriced`;
	else if (hostsTruncated) sub = "partial — too many hosts";

	return (
		<UsageCard
			label="Est. spend · 1h"
			value={`≈${fmtMoneyCompact(dominant.amount, dominant.currency)}`}
			sub={sub}
			mono
		/>
	);
}

/** Suspense fallback matching the tile row. */
export function ResourceSpendCardSkeleton() {
	return <UsageCard label="Est. spend · 1h" value="…" />;
}
