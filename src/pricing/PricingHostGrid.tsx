import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import type { HostCard } from "@/lib/priceCatalog";
import type { MatrixHost } from "@/lib/pricingMatrix";
import { cn } from "@/lib/utils";
import { Section } from "@/shared/Section";
import { fmtMoneyCompact } from "@/usage/format";

/** Cards a folded grid shows: two rows on wide screens. */
const FOLDED = 8;

/** A card per host; picking one opens its full rate table below. */
export function PricingHostGrid({
	cards,
	open,
}: {
	cards: HostCard[];
	/** Slug of the host whose table is open. */
	open?: string;
}) {
	const [expanded, setExpanded] = useState(false);
	if (cards.length === 0) return null;
	const showAll = expanded || cards.length <= FOLDED;
	const visible = showAll ? cards : cards.slice(0, FOLDED);
	return (
		<Section
			title="Hosts"
			meta={`${cards.length} ${cards.length === 1 ? "host serves" : "hosts serve"} models, busiest first`}
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
				{visible.map((card) => (
					<HostTile
						key={card.host.id}
						card={card}
						open={card.host.slug === open}
					/>
				))}
			</div>
			{cards.length > FOLDED && (
				<div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? "Show fewer" : `Show all ${cards.length} hosts`}
					</Button>
				</div>
			)}
		</Section>
	);
}

function HostTile({ card, open }: { card: HostCard; open: boolean }) {
	const { host, models, unpriced, range, usage } = card;
	return (
		<Link
			to="/pricing"
			search={(prev) => ({ ...prev, host: open ? undefined : host.slug })}
			aria-pressed={open}
			className={cn(
				"grid content-start gap-3 rounded-lg border p-4 transition-colors",
				open ? "border-primary bg-muted/40" : "border-rule hover:border-ink-3",
			)}
		>
			<span className="flex min-w-0 items-center gap-2.5">
				<MatrixHostLogo host={host} size={24} />
				<span className="truncate text-label font-medium text-foreground">
					{host.label}
				</span>
			</span>
			<span className="grid gap-1 text-meta tabular-nums">
				<span className="text-ink-2">
					{models} model{models === 1 ? "" : "s"}
				</span>
				{unpriced > 0 && <span className="text-warn">{unpriced} unpriced</span>}
				<span className="text-ink-2">
					{range
						? range.min === range.max
							? `${fmtRangeEnd(range.min)} / 1M`
							: `${fmtRangeEnd(range.min)} – ${fmtRangeEnd(range.max)} / 1M`
						: "No token prices"}
				</span>
				<span className={usage?.usd ? "text-foreground" : "text-ink-3"}>
					{usage?.usd != null
						? `${fmtMoneyCompact(usage.usd, "USD")} last 7 days`
						: usage?.requests
							? `${usage.requests} requests, unpriced`
							: "No traffic last 7 days"}
				</span>
			</span>
		</Link>
	);
}

/** A blended price at a range end: cents, or three decimals under $0.10 so
 * the cheapest models don't all read $0.04. */
function fmtRangeEnd(amount: number): string {
	return `$${amount.toFixed(amount < 0.1 ? 3 : 2)}`;
}

/** A pricing-matrix host's logo. */
export function MatrixHostLogo({
	host,
	size,
}: {
	host: MatrixHost;
	size: number;
}) {
	return (
		<HostLogo
			host={hostRefLogo({
				name: host.slug,
				displayName: host.label,
				icon: host.icon,
			})}
			size={size}
		/>
	);
}
