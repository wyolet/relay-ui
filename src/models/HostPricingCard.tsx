import { Link } from "@tanstack/react-router";
import { DollarSign, TrendingDown } from "lucide-react";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel } from "@/lib/displayLabel";
import type { HostPricing } from "@/models/useModelPricing";
import { fmtCost, MeterGrid } from "@/pricing/MeterGrid";

/** One host's pricing card: rates, billing context, and cost figures. */
export function HostPricingCard({
	pricing,
	windowText,
}: {
	pricing: HostPricing;
	windowText: string;
}) {
	const {
		row,
		host,
		rates,
		currency,
		pricingName,
		exampleCost,
		estSpend,
		usage,
		isCheapest,
	} = pricing;
	const hasPricing = rates.length > 0;
	const snapshots = row.binding.snapshots ?? [];
	const hasBillingContext = !!row.binding.upstreamName || snapshots.length > 0;

	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex min-w-0 items-center gap-2">
					<Link to="/hosts/$name" params={{ name: row.host.name }}>
						<HostCell
							host={host}
							size="sm"
							fallbackLabel={displayLabel(row.host)}
						/>
					</Link>
					<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
						{row.binding.adapter}
					</span>
					{!row.binding.enabled && (
						<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
							disabled
						</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{isCheapest && (
						<span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
							<TrendingDown className="size-3" aria-hidden />
							Cheapest
						</span>
					)}
					{hasPricing &&
						(pricingName ? (
							<Link
								to="/pricing/$name"
								params={{ name: pricingName }}
								title={`View pricing "${pricingName}"`}
								className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground hover:underline"
							>
								{currency}
							</Link>
						) : (
							<span className="font-mono text-[11px] uppercase text-muted-foreground">
								{currency}
							</span>
						))}
				</div>
			</header>
			<div className="flex flex-col gap-3 px-4 py-3">
				{hasPricing ? (
					<MeterGrid rates={rates} currency={currency} />
				) : (
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<DollarSign
							className="size-3.5 text-muted-foreground/60"
							aria-hidden
						/>
						No pricing attached to this host binding.
					</div>
				)}

				{(hasBillingContext || exampleCost != null || estSpend != null) && (
					<dl className="flex flex-col gap-1.5 border-t border-border/60 pt-2.5 text-[11px]">
						{row.binding.upstreamName && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">Billed as</dt>
								<dd className="truncate font-mono text-foreground">
									{row.binding.upstreamName}
								</dd>
							</div>
						)}
						{snapshots.length > 0 && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">Snapshots</dt>
								<dd className="flex flex-wrap justify-end gap-1">
									{snapshots.map((s) => (
										<span
											key={s}
											className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
										>
											{s}
										</span>
									))}
								</dd>
							</div>
						)}
						{exampleCost != null && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">
									Example request{" "}
									<span className="text-muted-foreground/60">
										(800 in / 200 out)
									</span>
								</dt>
								<dd className="font-mono tabular-nums text-foreground">
									≈ {fmtCost(exampleCost, currency)}{" "}
									<span className="text-muted-foreground">/ 1K</span>
								</dd>
							</div>
						)}
						{estSpend != null && usage && (
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">
									Est. spend · last {windowText}{" "}
									<span className="text-muted-foreground/60">
										({usage.requests.toLocaleString()} req)
									</span>
								</dt>
								<dd className="font-mono tabular-nums text-foreground">
									≈ {fmtCost(estSpend, "USD")}
								</dd>
							</div>
						)}
					</dl>
				)}
			</div>
		</section>
	);
}
