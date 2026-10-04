import { CircleDollarSign } from "lucide-react";
import type { ScopeSpend } from "@/api/hooks/usage";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";
import { fmtCompact, fmtInt, fmtMoney } from "@/usage/format";
import { UsageCard } from "@/usage/ResourceUsageCards";

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
		spend.total.usd === null ? "—" : fmtMoney(spend.total.usd, "USD");
	return (
		<DetailCard title="Spend this period" icon={CircleDollarSign}>
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				<UsageCard label="Cost" value={total} mono />
				<UsageCard label="Requests" value={fmtInt(spend.requests)} mono />
				<UsageCard label="Tokens" value={fmtCompact(spend.tokens)} mono />
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
							<li
								key={row.key}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<span className="min-w-0 truncate">{renderKey(row.key)}</span>
								<span className="font-mono text-muted-foreground shrink-0">
									{row.cost.usd === null ? "—" : fmtMoney(row.cost.usd, "USD")}{" "}
									· {fmtInt(row.requests)} req
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</DetailCard>
	);
}
