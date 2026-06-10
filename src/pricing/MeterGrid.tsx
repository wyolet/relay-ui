import {
	groupByMeter,
	type MeterGroup,
	type RateLike,
	tokenKeyForMeter,
} from "@/lib/usage-math/pricing";
import { cn } from "@/lib/utils";

/** Accent dot per common meter (bare token key), so input/output read at a glance. */
const METER_ACCENT: Record<string, string> = {
	input: "bg-[var(--chart-1)]",
	output: "bg-[var(--chart-2)]",
	cache_read: "bg-[var(--chart-3)]",
	cache_creation: "bg-[var(--chart-4)]",
};

function meterAccent(meter: string): string {
	return (
		METER_ACCENT[tokenKeyForMeter(meter).toLowerCase()] ??
		"bg-muted-foreground/40"
	);
}

/** "tokens.cache_read" → "Cache read"; leaves unknown meters readable. */
export function prettyMeter(meter: string): string {
	const s = tokenKeyForMeter(meter).replace(/[_-]+/g, " ").trim();
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "per_million" → "1M tokens", "per_unit" → "unit"; unknowns stay readable. */
export function prettyUnit(unit: string): string {
	if (unit === "per_million") return "1M tokens";
	if (unit === "per_unit") return "unit";
	return unit.replace(/[_-]+/g, " ").trim();
}

export function fmtRate(amount: number, currency: string): string {
	const prefix = currency.toUpperCase() === "USD" ? "$" : "";
	const digits = amount !== 0 && Math.abs(amount) < 1 ? 4 : 2;
	return `${prefix}${amount.toFixed(digits)}`;
}

/** Total cost with adaptive precision (small example costs need more digits). */
export function fmtCost(amount: number, currency: string): string {
	const prefix = currency.toUpperCase() === "USD" ? "$" : "";
	if (amount === 0) return `${prefix}0`;
	const digits = amount < 0.01 ? 4 : amount < 1 ? 3 : 2;
	return `${prefix}${amount.toFixed(digits)}`;
}

function fmtTokens(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
	return String(n);
}

/** The meter-tile grid for a set of rates. */
export function MeterGrid({
	rates,
	currency,
}: {
	rates: readonly RateLike[];
	currency: string;
}) {
	const meters = groupByMeter(rates);
	if (meters.length === 0) {
		return <p className="text-xs text-muted-foreground">No rates defined.</p>;
	}
	return (
		<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
			{meters.map((g) => (
				<MeterTile key={g.meter} group={g} currency={currency} />
			))}
		</div>
	);
}

function MeterTile({
	group,
	currency,
}: {
	group: MeterGroup;
	currency: string;
}) {
	const [base, ...tiers] = group.rates;
	if (!base) return null;
	return (
		<div className="flex flex-col rounded-lg border border-border bg-muted/30 px-3.5 py-3">
			<div className="mb-1.5 flex items-center gap-1.5">
				<span
					className={cn("size-2 rounded-full", meterAccent(group.meter))}
					aria-hidden
				/>
				<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
					{prettyMeter(group.meter)}
				</span>
			</div>
			<div className="flex items-baseline gap-1">
				<span className="text-2xl font-semibold tabular-nums text-foreground">
					{fmtRate(base.amount, currency)}
				</span>
				<span className="text-[11px] text-muted-foreground">
					/ {prettyUnit(group.unit)}
				</span>
			</div>
			{tiers.length > 0 && (
				<dl className="mt-2 space-y-1 border-t border-border/60 pt-2">
					{tiers.map((t) => (
						<div
							key={t.aboveTokens ?? 0}
							className="flex items-center justify-between text-[10px]"
						>
							<dt className="text-muted-foreground">
								≥ {fmtTokens(t.aboveTokens ?? 0)} tokens
							</dt>
							<dd className="font-mono tabular-nums text-foreground">
								{fmtRate(t.amount, currency)}
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
}
