import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MatrixHost } from "@/lib/pricingMatrix";
import type { TierRow, TierTab } from "@/lib/priceCatalog";
import { RateValue } from "@/pricing/MeterGrid";
import { AddPriceLink } from "@/pricing/ModelPrice";
import { MatrixHostLogo } from "@/pricing/PricingHostGrid";
import type { TierTabView } from "@/pricing/usePricingCatalog";
import { Section } from "@/shared/Section";
import { Segmented } from "@/shared/Segmented";
import { fmtMoneyCompact } from "@/usage/format";

/** Rows a folded tab shows before "Show all". */
const FOLDED = 15;

const GRID =
	"grid grid-cols-[minmax(10rem,1fr)_minmax(9rem,13rem)_repeat(2,5.5rem)_4.5rem_6rem] items-baseline gap-x-5";

/** Models in one price tier, each at its cheapest host. */
export function PricingTierTable({
	tabs,
	tier,
	rows,
	onTier,
}: {
	tabs: TierTabView[];
	tier: TierTab;
	rows: TierRow[];
	onTier: (tier: TierTab) => void;
}) {
	return (
		<Section
			title="Models by price"
			meta="blended (3 × input + output) / 4 per 1M at the cheapest host"
		>
			<Segmented
				variant="underline"
				value={tier}
				onChange={onTier}
				options={tabs.map((t) => ({
					value: t.value,
					label: <TabLabel tab={t} />,
				}))}
			/>
			<TierRows key={tier} rows={rows} unpricedTab={tier === "unpriced"} />
		</Section>
	);
}

function TabLabel({ tab }: { tab: TierTabView }) {
	const sub = [tab.range, tab.example && `e.g. ${tab.example}`]
		.filter(Boolean)
		.join(" · ");
	return (
		<span className="grid gap-0.5 text-left">
			<span className="text-label font-medium">
				{tab.label}{" "}
				<span className="text-meta font-normal text-ink-3 tabular-nums">
					{tab.count}
				</span>
			</span>
			{sub && (
				<span className="max-w-48 truncate text-foot text-ink-3">{sub}</span>
			)}
		</span>
	);
}

function TierRows({
	rows,
	unpricedTab,
}: {
	rows: TierRow[];
	unpricedTab: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	if (rows.length === 0) {
		return (
			<p className="text-label text-ink-2">
				{unpricedTab
					? "Every served model has a price."
					: "No models in this tier."}
			</p>
		);
	}
	const visible = expanded ? rows : rows.slice(0, FOLDED);
	return (
		<>
			<div className="overflow-x-auto">
				<div className="min-w-[48rem]">
					<div
						className={`${GRID} border-b border-rule pb-2 text-meta text-ink-3`}
					>
						<span>Model</span>
						<span>{unpricedTab ? "Unpriced at" : "Cheapest at"}</span>
						<span className="text-right">Input</span>
						<span className="text-right">Output</span>
						<span className="text-right">Hosts</span>
						<span className="text-right">Spend, 7 days</span>
					</div>
					{visible.map((row) => (
						<TierLine key={row.model.id} row={row} unpricedTab={unpricedTab} />
					))}
				</div>
			</div>
			{rows.length > FOLDED && (
				<div className="flex items-center gap-3 text-meta text-ink-3">
					{!expanded && (
						<span>
							Your spend, then newest first · {FOLDED} of {rows.length}
						</span>
					)}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? "Show fewer" : `Show all ${rows.length} models`}
					</Button>
				</div>
			)}
		</>
	);
}

function TierLine({
	row,
	unpricedTab,
}: {
	row: TierRow;
	unpricedTab: boolean;
}) {
	const cells = row.cheapest?.row.cells;
	const currency = row.cheapest?.row.currency ?? "USD";
	return (
		<div
			className={`${GRID} border-b border-rule py-2.5 text-label tabular-nums`}
		>
			<span className="flex min-w-0 items-baseline gap-2">
				<Link
					to="/models/$name"
					params={{ name: row.model.slug }}
					search={{ tab: "pricing" }}
					className="truncate text-foreground hover:underline"
					title={row.model.label}
				>
					{row.model.label}
				</Link>
				{row.model.deprecated && (
					<span className="shrink-0 text-meta text-ink-3">deprecated</span>
				)}
			</span>
			{unpricedTab ? (
				<UnpricedHosts hosts={row.unpricedHosts} modelId={row.model.id} />
			) : (
				<HostName host={row.cheapest?.host} />
			)}
			<RateValue cell={cells?.["tokens.input"]} currency={currency} />
			<RateValue cell={cells?.["tokens.output"]} currency={currency} />
			<span className="text-right text-ink-2">{row.hostCount}</span>
			<span className="text-right text-foreground">
				{row.usage?.usd != null ? (
					fmtMoneyCompact(row.usage.usd, "USD")
				) : (
					<span className="text-ink-3">—</span>
				)}
			</span>
		</div>
	);
}

function HostName({ host }: { host: MatrixHost | undefined }) {
	if (!host) return <span className="text-ink-3">—</span>;
	return (
		<span className="flex min-w-0 items-baseline gap-2 text-ink-2">
			<span className="self-center">
				<MatrixHostLogo host={host} size={16} />
			</span>
			<span className="truncate" title={host.label}>
				{host.label}
			</span>
		</span>
	);
}

function UnpricedHosts({
	hosts,
	modelId,
}: {
	hosts: MatrixHost[];
	modelId: string;
}) {
	const [first] = hosts;
	if (!first) return <span className="text-ink-3">—</span>;
	return (
		<span className="flex min-w-0 items-baseline gap-2">
			<AddPriceLink
				hostId={first.id}
				modelId={modelId}
				className="truncate text-warn hover:underline"
				title={`Add a price on ${first.label}`}
			>
				{first.label}
			</AddPriceLink>
			{hosts.length > 1 && (
				<span className="shrink-0 text-meta text-ink-3">
					+{hosts.length - 1}
				</span>
			)}
		</span>
	);
}
