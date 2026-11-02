import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type HostPrice,
	type ModelPriceSummary,
	RATE_COLUMNS,
} from "@/lib/pricingMatrix";
import { fmtBlendedPrice } from "@/lib/usage-math/blendedPrice";
import { fmtRate } from "@/pricing/MeterGrid";

const UNPRICED_CLASS =
	"inline-flex shrink-0 items-center rounded border border-warning/30 bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning";

/** The new-pricing page, preset to one model on one host. */
export function AddPriceLink({
	hostId,
	modelId,
	className,
	title,
	children,
}: {
	hostId: string;
	modelId: string;
	className: string;
	title?: string;
	children: ReactNode;
}) {
	return (
		<Link
			to="/pricing/new"
			search={{ host: hostId, model: modelId }}
			className={className}
			title={title}
		>
			{children}
		</Link>
	);
}

/** Marks a model relay can't price; links to a new sheet preset to it. */
export function UnpricedBadge({
	hostId,
	modelId,
	link = true,
}: {
	hostId: string;
	modelId: string;
	/** False inside another control (e.g. a picker row button). */
	link?: boolean;
}) {
	if (!link) return <span className={UNPRICED_CLASS}>Unpriced</span>;
	return (
		<AddPriceLink
			hostId={hostId}
			modelId={modelId}
			className={`${UNPRICED_CLASS} hover:bg-warning/15`}
			title="Requests to it are refused under a budget. Add a price."
		>
			Unpriced
		</AddPriceLink>
	);
}

/** A model's blended price ("from" its cheapest host), its unpriced badge,
 * or nothing while prices load or when no host serves it. */
export function ModelPrice({
	modelId,
	summary,
	link = true,
}: {
	modelId: string;
	summary: ModelPriceSummary | undefined;
	link?: boolean;
}) {
	if (!summary || summary.hosts.length === 0) return null;
	const { lowest, unpricedHosts } = summary;
	const [firstUnpriced] = unpricedHosts;
	if (!lowest && firstUnpriced && unpricedHosts.length === summary.hosts.length)
		return (
			<UnpricedBadge hostId={firstUnpriced.id} modelId={modelId} link={link} />
		);
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap text-xs tabular-nums text-foreground cursor-default">
						{lowest ? (
							<>
								{lowest.from && (
									<span className="text-muted-foreground">from</span>
								)}
								{fmtBlendedPrice(lowest.price)}
							</>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</span>
				}
			/>
			<TooltipContent className="max-w-sm">
				<PriceBreakdown summary={summary} />
			</TooltipContent>
		</Tooltip>
	);
}

function PriceBreakdown({ summary }: { summary: ModelPriceSummary }) {
	return (
		<div className="flex flex-col gap-2 text-left">
			<span className="text-background/70">
				Blended 3:1 input to output, base tier
			</span>
			<ul className="flex flex-col gap-1.5">
				{summary.hosts.map((h) => (
					<HostPriceLine key={h.host.id} price={h} />
				))}
			</ul>
		</div>
	);
}

function HostPriceLine({ price }: { price: HostPrice }) {
	const { host, row, unpriced } = price;
	const rates = RATE_COLUMNS.flatMap((c) => {
		const cell = row.cells[c.meter];
		return cell
			? [
					`${c.label} ${fmtRate(cell.amount, row.currency)}${cell.unit === "per_million" ? "" : "/unit"}${cell.tiered ? "+" : ""}`,
				]
			: [];
	});
	const tiered = RATE_COLUMNS.some((c) => row.cells[c.meter]?.tiered);
	return (
		<li className="flex flex-col">
			<span className="flex items-baseline justify-between gap-3">
				<span className="font-medium">{host.label}</span>
				<span className="tabular-nums">
					{unpriced
						? "Unpriced"
						: row.blended
							? fmtBlendedPrice(row.blended)
							: "—"}
				</span>
			</span>
			{!unpriced && rates.length > 0 && (
				<span className="text-background/70 tabular-nums">
					{rates.join(" · ")}
					{row.extra > 0 &&
						` · +${row.extra} meter${row.extra === 1 ? "" : "s"}`}
				</span>
			)}
			{tiered && (
				<span className="text-background/70">
					+ higher rates above a token threshold
				</span>
			)}
		</li>
	);
}
