import { Link } from "@tanstack/react-router";
import {
	type HostPrices,
	type PriceRow,
	RATE_COLUMNS,
	type RateCell,
} from "@/lib/pricingMatrix";
import { fmtRate } from "@/pricing/MeterGrid";
import { Section } from "@/shared/Section";

const GRID =
	"grid grid-cols-[minmax(10rem,1fr)_repeat(4,5.5rem)_minmax(8rem,14rem)] items-baseline gap-x-5";

/** One host's models and the rates relay prices them at. */
export function HostPricesSection({ prices }: { prices: HostPrices }) {
	const { host, rows, unpriced } = prices;
	return (
		<Section
			title={host.label}
			meta={`${rows.length} model${rows.length === 1 ? "" : "s"}${unpriced > 0 ? ` · ${unpriced} unpriced` : ""}`}
			aside={
				<Link
					to="/hosts/$name"
					params={{ name: host.slug }}
					className="text-meta text-ink-3 hover:text-foreground"
				>
					Host →
				</Link>
			}
		>
			<div className="overflow-x-auto">
				<div className="min-w-[46rem]">
					<div
						className={`${GRID} border-b border-rule pb-2 text-meta text-ink-3`}
					>
						<span>Model</span>
						{RATE_COLUMNS.map((c) => (
							<span key={c.meter} className="text-right">
								{c.label}
							</span>
						))}
						<span>Rate sheet</span>
					</div>
					{rows.map((row) => (
						<PriceLine key={row.model.id} row={row} hostId={host.id} />
					))}
				</div>
			</div>
		</Section>
	);
}

function PriceLine({ row, hostId }: { row: PriceRow; hostId: string }) {
	return (
		<div
			className={`${GRID} border-b border-rule py-2.5 text-label tabular-nums`}
		>
			<span className="flex min-w-0 items-center gap-2">
				{row.unpriced && (
					<span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden />
				)}
				<Link
					to="/models/$name"
					params={{ name: row.model.slug }}
					className="truncate text-foreground hover:underline"
					title={row.model.label}
				>
					{row.model.label}
				</Link>
				{!row.served && (
					<span className="shrink-0 text-meta text-ink-3">not served</span>
				)}
			</span>
			{row.unpriced ? (
				<span className="col-span-4 text-ink-3">Unpriced</span>
			) : (
				RATE_COLUMNS.map((c) => (
					<Rate
						key={c.meter}
						cell={row.cells[c.meter]}
						currency={row.currency}
					/>
				))
			)}
			<SheetCell row={row} hostId={hostId} />
		</div>
	);
}

function Rate({
	cell,
	currency,
}: {
	cell: RateCell | undefined;
	currency: string;
}) {
	if (!cell) return <span className="text-right text-ink-3">—</span>;
	return (
		<span className="text-right text-foreground">
			{fmtRate(cell.amount, currency)}
			{cell.unit !== "per_million" && (
				<span className="text-meta text-ink-3">/unit</span>
			)}
			{cell.tiered && (
				<span
					className="text-ink-3"
					title="Higher rates above a token threshold"
				>
					+
				</span>
			)}
		</span>
	);
}

function SheetCell({ row, hostId }: { row: PriceRow; hostId: string }) {
	if (!row.sheet) {
		return (
			<Link
				to="/pricing/new"
				search={{ host: hostId, model: row.model.id }}
				className="truncate text-ink-2 hover:text-foreground"
			>
				Add pricing →
			</Link>
		);
	}
	return (
		<span className="flex min-w-0 items-baseline gap-2">
			<Link
				to="/pricing/$name"
				params={{ name: row.sheet.name }}
				className="truncate text-ink-2 hover:text-foreground"
				title={row.sheet.label}
			>
				{row.sheet.label}
			</Link>
			{!row.sheet.enabled && (
				<span className="shrink-0 text-meta text-ink-3">disabled</span>
			)}
			{row.extra > 0 && (
				<span className="shrink-0 text-meta text-ink-3">
					+{row.extra} meter{row.extra === 1 ? "" : "s"}
				</span>
			)}
		</span>
	);
}
