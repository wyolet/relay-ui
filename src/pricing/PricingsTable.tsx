import { Link } from "@tanstack/react-router";
import type { Pricing } from "@/api/types/pricing";
import { displayLabel } from "@/lib/displayLabel";
import { summarizeRatesParts } from "@/lib/usage-math/pricing";
import { fmtRate, prettyMeter, prettyUnit } from "@/pricing/MeterGrid";
import { useHostOptionById } from "@/pricing/useHostOptions";
import { useTargetModelLabeler } from "@/pricing/useTargetModelOptions";

export function PricingsTable({ items }: { items: Pricing[] }) {
	const labelOf = useTargetModelLabeler();
	const hostOf = useHostOptionById();
	return (
		<div className="rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Name</Th>
						<Th>Host</Th>
						<Th>Rates</Th>
						<Th>Target models</Th>
						<Th className="text-right">Status</Th>
						<Th className="text-right">Updated</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{items.map((p) => (
						<Row
							key={p.metadata.id ?? p.metadata.name}
							p={p}
							labelOf={labelOf}
							hostOf={hostOf}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Row({
	p,
	labelOf,
	hostOf,
}: {
	p: Pricing;
	labelOf: (value: string) => string;
	hostOf: ReturnType<typeof useHostOptionById>;
}) {
	const name = p.metadata.name;
	const enabled = p.spec.enabled !== false;
	const targets = p.spec.targetModels ?? [];
	const host = p.metadata.owner?.id ? hostOf(p.metadata.owner.id) : undefined;
	return (
		<tr className="hover:bg-muted/30 transition-colors">
			<Td>
				<div className="min-w-0">
					<Link
						to="/pricing/$name"
						params={{ name }}
						className="text-foreground hover:underline truncate font-medium"
					>
						{displayLabel(p.metadata)}
					</Link>
					<div className="text-[11px] text-muted-foreground font-mono truncate">
						{name}
					</div>
				</div>
			</Td>
			<Td>
				{host ? (
					<div className="min-w-0">
						<span className="block truncate text-xs text-foreground">
							{host.label}
						</span>
						<span className="block font-mono text-[10px] uppercase text-muted-foreground">
							{p.spec.currency || "USD"}
						</span>
					</div>
				) : (
					<span className="font-mono text-[11px] uppercase text-muted-foreground">
						{p.spec.currency || "USD"}
					</span>
				)}
			</Td>
			<Td>
				<RatesSummary p={p} />
			</Td>
			<Td>
				{targets.length === 0 ? (
					<span className="text-muted-foreground">—</span>
				) : (
					<span className="text-xs text-foreground">
						{targets.slice(0, 2).map(labelOf).join(", ")}
						{targets.length > 2 && (
							<span className="text-muted-foreground">
								{" "}
								+{targets.length - 2}
							</span>
						)}
					</span>
				)}
			</Td>
			<Td className="text-right">
				{enabled ? (
					<span className="text-[11px] text-success">
						Enabled
					</span>
				) : (
					<span className="text-[11px] text-muted-foreground">Disabled</span>
				)}
			</Td>
			<Td className="text-right text-[11px] text-muted-foreground tabular-nums">
				{p.metadata.updatedAt
					? new Date(p.metadata.updatedAt).toLocaleDateString()
					: "—"}
			</Td>
		</tr>
	);
}

function RatesSummary({ p }: { p: Pricing }) {
	const parts = summarizeRatesParts(p.spec.rates ?? []);
	if (parts.length === 0) {
		return <span className="text-xs text-muted-foreground">No rates</span>;
	}
	const currency = p.spec.currency || "USD";
	// All meters typically share a unit; show it once when they do.
	const units = new Set(parts.map((x) => x.unit));
	const sharedUnit = units.size === 1 ? parts[0]?.unit : null;
	return (
		<span className="text-xs text-foreground font-mono tabular-nums">
			{parts.map((part, i) => (
				<span key={part.meter}>
					{i > 0 && <span className="text-muted-foreground"> · </span>}
					<span className="text-muted-foreground">
						{shortMeter(part.meter)}{" "}
					</span>
					{fmtRate(part.amount, currency)}
					{part.tiers > 0 && (
						<span className="text-muted-foreground">+{part.tiers}t</span>
					)}
					{!sharedUnit && (
						<span className="text-muted-foreground">
							/{prettyUnit(part.unit)}
						</span>
					)}
				</span>
			))}
			{sharedUnit && (
				<span className="text-muted-foreground">
					{" "}
					/ {prettyUnit(sharedUnit)}
				</span>
			)}
		</span>
	);
}

function shortMeter(meter: string): string {
	if (meter === "tokens.input") return "in";
	if (meter === "tokens.output") return "out";
	return prettyMeter(meter).toLowerCase();
}

function Th({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-1.5 text-left font-medium ${className}`}
		>
			{children}
		</th>
	);
}

function Td({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
