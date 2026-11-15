import { compactNumber } from "@/lib/rateLimitFormat";
import { prettyMeter } from "@/lib/usage-math/pricing";

const usd = (fractionDigits: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: 2,
	});

/** A USD decimal string as "$50", "$12.40" or "<$0.01"; unparseable input passes through. */
export function fmtUsd(decimal: string): string {
	const n = Number(decimal);
	if (decimal.trim() === "" || !Number.isFinite(n)) return decimal;
	if (n > 0 && n < 0.01) return "<$0.01";
	return usd(Number.isInteger(n) ? 0 : 2).format(n);
}

/** How full a meter is, 0..1. A zero cap reads as full: it admits nothing. */
export function meterShare(used: number, cap: number): number {
	if (!Number.isFinite(used) || !Number.isFinite(cap)) return 0;
	if (cap <= 0) return 1;
	return Math.min(1, Math.max(0, used / cap));
}

/** A rate-limit rule's count against its amount: "420 / 1k". */
export function fmtRuleUsage(used: number, amount: number): string {
	return `${compactNumber(used)} / ${compactNumber(amount)}`;
}

/** A budget's spend against its cap: "$12.40 / $50". */
export function fmtBudgetUsage(spentUsd: string, amountUsd: string): string {
	return `${fmtUsd(spentUsd)} / ${fmtUsd(amountUsd)}`;
}

/** A rule as a model's policy applies it: "5M input tokens / 1m". The window
 * arrives as a Go duration ("1h0m0s"); its trailing zero units drop. */
export function fmtLimit(limit: {
	amount: number;
	meter: string;
	window: string;
}): string {
	const window = limit.window.replace(/([hm])0s$/, "$1").replace(/h0m$/, "h");
	const meter = limit.meter.startsWith("tokens.")
		? `${prettyMeter(limit.meter).toLowerCase()} tokens`
		: limit.meter;
	return `${compactNumber(limit.amount)} ${meter} / ${window}`;
}
