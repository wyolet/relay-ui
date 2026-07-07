/**
 * Cross-domain number/time formatters. Domain modules (`usage/format`,
 * `logs/format`) re-export the subset they need so existing call sites keep
 * their local import, but the single source of truth lives here.
 *
 * NOTE: `compactNumber` in `lib/rateLimitFormat` is deliberately *not* the same
 * as `fmtCompact` — it uses a >5%-rounding rule tuned for rate-limit amounts
 * and has its own test suite. Don't fold them together.
 */

export function fmtInt(n: number): string {
	return n.toLocaleString();
}

/** Latency in ms → "123 ms" / "1.2 s". */
export function fmtMs(ms: number): string {
	if (ms >= 1000)
		return `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
	return `${Math.round(ms)} ms`;
}

/** Absolute local timestamp, e.g. "5/30/2026, 2:14:09 PM". */
export function fmtTs(ts: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return d.toLocaleString();
}

/** Large counts → "1.3B" / "4.1M" / "12.4k". */
export function fmtCompact(n: number): string {
	if (n >= 1_000_000_000)
		return `${(n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
	if (n >= 1_000)
		return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
	return n.toLocaleString();
}

export function sumTokens(
	tokens: { [key: string]: number } | undefined,
): number {
	if (!tokens) return 0;
	let total = 0;
	for (const v of Object.values(tokens)) total += v;
	return total;
}
