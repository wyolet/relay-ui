import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { displayLabel } from "@/lib/displayLabel";
import { useBudgetCovers } from "@/policies/usePolicyUnpricedModels";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";

/** The policies a budget caps, and how many of each one's granted models
 * the budget refuses for want of a price. */
export function BudgetCovers({ budgetName }: { budgetName: string }) {
	const covers = useBudgetCovers(budgetName);
	return (
		<DetailCard title="Covers" icon={ShieldCheck}>
			{!covers ? (
				<DetailEmpty>Loading policies…</DetailEmpty>
			) : covers.length === 0 ? (
				<DetailEmpty>No policy links this budget.</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					{covers.map(({ policy, unpriced }) => (
						<li
							key={policy.metadata.id ?? policy.metadata.name}
							className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
						>
							<Link
								to="/policies/$name"
								params={{ name: policy.metadata.name }}
								className="min-w-0 truncate text-sm text-foreground hover:underline"
							>
								{displayLabel(policy.metadata)}
							</Link>
							<span
								className={`shrink-0 text-[11px] ${unpriced ? "text-warning" : "text-muted-foreground"}`}
							>
								{unpriced == null
									? "…"
									: unpriced === 0
										? "every granted model priced"
										: `${unpriced} unpriced model${unpriced === 1 ? "" : "s"} refused`}
							</span>
						</li>
					))}
				</ul>
			)}
		</DetailCard>
	);
}
