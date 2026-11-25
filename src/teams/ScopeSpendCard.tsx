import { CircleDollarSign } from "lucide-react";
import type { ScopeSpend } from "@/api/hooks/usage";
import { DetailCard, DetailEmpty, DetailListRow } from "@/shared/DetailCard";
import { MetaParts } from "@/shared/MetaParts";
import { StatCard } from "@/shared/StatCard";
import { fmtCompact, fmtInt, fmtMoneyCompact } from "@/usage/format";

/**
 * This period's spend for a team or project. Renders nothing when the
 * deployment has no usage reader — the tiles are a bonus, never a page
 * failure. `renderKey` turns a breakdown row's group value into a label.
 */
export function ScopeSpendCard({
	spend,
	unavailable,
	breakdownLabel,
	renderKey,
}: {
	spend: ScopeSpend | null;
	unavailable: boolean;
	breakdownLabel: string;
	renderKey: (key: string) => React.ReactNode;
}) {
	if (unavailable || !spend) return null;
	const total =
		spend.total.usd === null ? "—" : fmtMoneyCompact(spend.total.usd, "USD");
	return (
		<DetailCard title="Spend this period" icon={CircleDollarSign}>
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				<StatCard label="Cost" value={total} mono />
				<StatCard label="Requests" value={fmtInt(spend.requests)} mono />
				<StatCard label="Tokens" value={fmtCompact(spend.tokens)} mono />
			</div>
			<div className="mt-3">
				<h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
					{breakdownLabel}
				</h3>
				{spend.rows.length === 0 ? (
					<DetailEmpty>No traffic in this period.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{spend.rows.map((row) => (
							<DetailListRow key={row.key}>
								<span className="min-w-0 truncate">{renderKey(row.key)}</span>
								<MetaParts
									className="shrink-0 font-mono text-xs tabular-nums"
									parts={[
										row.cost.usd === null
											? "—"
											: fmtMoneyCompact(row.cost.usd, "USD"),
										`${fmtInt(row.requests)} ${row.requests === 1 ? "request" : "requests"}`,
									]}
								/>
							</DetailListRow>
						))}
					</ul>
				)}
			</div>
		</DetailCard>
	);
}
