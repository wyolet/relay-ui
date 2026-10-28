import {
	groupByMeter,
	type MeterGroup,
	prettyMeter,
	type RateLike,
} from "@/lib/usage-math/pricing";

/** "per_million" → "1M tokens", "per_unit" → "unit"; unknowns stay readable. */
export function prettyUnit(unit: string): string {
	if (unit === "per_million") return "1M tokens";
	if (unit === "per_unit") return "unit";
	return unit.replace(/[_-]+/g, " ").trim();
}

/** "$15.00", "$0.30", "$0.075": two decimals at least, four at most. */
export function fmtRate(amount: number, currency: string): string {
	const prefix = currency.toUpperCase() === "USD" ? "$" : "";
	const text = amount.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
		useGrouping: false,
	});
	return `${prefix}${text}`;
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

/** A rate sheet as figures: each meter's base rate, its unit, and any
 * higher tiers beneath. */
export function MeterGrid({
	rates,
	currency,
}: {
	rates: readonly RateLike[];
	currency: string;
}) {
	const meters = groupByMeter(rates);
	if (meters.length === 0) {
		return <p className="text-label text-ink-2">No rates defined.</p>;
	}
	return (
		<div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
			{meters.map((g) => (
				<MeterFigure key={g.meter} group={g} currency={currency} />
			))}
		</div>
	);
}

function MeterFigure({
	group,
	currency,
}: {
	group: MeterGroup;
	currency: string;
}) {
	const [base, ...tiers] = group.rates;
	if (!base) return null;
	return (
		<div className="grid min-w-0 content-start gap-1.5">
			<span className="font-display text-mini-figure text-foreground tabular-nums">
				{fmtRate(base.amount, currency)}
			</span>
			<span className="truncate text-label text-ink-2">
				{prettyMeter(group.meter)}
			</span>
			<span className="text-meta text-ink-3">per {prettyUnit(group.unit)}</span>
			{tiers.map((t) => (
				<span
					key={t.aboveTokens ?? 0}
					className="text-meta text-ink-3 tabular-nums"
				>
					{fmtRate(t.amount, currency)} above {fmtTokens(t.aboveTokens ?? 0)}{" "}
					tokens
				</span>
			))}
		</div>
	);
}
