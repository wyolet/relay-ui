import type { UnpricedGrant } from "@/lib/pricingMatrix";
import { useUnpricedUnderBudget } from "@/policies/usePolicyUnpricedModels";
import { AddPriceLink } from "@/pricing/ModelPrice";
import { AlertBanner } from "@/shared/AlertBanner";

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

/** Unpriced models with the hosts that serve them; each links to a new sheet for its first host. */
export function UnpricedGrantList({
	grants,
}: {
	grants: readonly UnpricedGrant[];
}) {
	return (
		<ul className="divide-y divide-warning/20">
			{grants.map(({ model, hosts }) => {
				const [host] = hosts;
				return (
					<li
						key={model.id}
						className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-[11px]"
					>
						<span className="min-w-0 truncate">
							<span className="text-foreground">{model.label}</span>
							<span className="text-muted-foreground">
								{" "}
								on {hosts.map((h) => h.label).join(", ")}
							</span>
						</span>
						{host && (
							<AddPriceLink
								hostId={host.id}
								modelId={model.id}
								className="shrink-0 text-muted-foreground hover:text-foreground"
							>
								Add price →
							</AddPriceLink>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/** Warns that a policy under a budget grants models relay will refuse for
 * want of a price. */
export function UnpricedUnderBudget({
	policyRef,
	budgetIds,
}: {
	policyRef: string | undefined;
	budgetIds: readonly string[];
}) {
	const gaps = useUnpricedUnderBudget(policyRef, budgetIds);
	if (!gaps) return null;
	const n = gaps.grants.length;
	return (
		<AlertBanner
			severity="warn"
			title={`${n} model${n === 1 ? "" : "s"} this policy grants ${n === 1 ? "has" : "have"} no price; requests to ${n === 1 ? "it" : "them"} are refused under ${listFormat.format(gaps.budgets)}`}
			body={<UnpricedGrantList grants={gaps.grants} />}
		/>
	);
}
