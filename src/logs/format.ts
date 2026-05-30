/** Absolute local timestamp, e.g. "5/30/2026, 2:14:09 PM". */
export function fmtTs(ts: string): string {
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return ts;
	return d.toLocaleString();
}

export function fmtInt(n: number): string {
	return n.toLocaleString();
}

/** Latency in ms → "123 ms" / "1.2 s". */
export function fmtMs(ms: number): string {
	if (ms >= 1000)
		return `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
	return `${Math.round(ms)} ms`;
}

export function sumTokens(
	tokens: { [key: string]: number } | undefined,
): number {
	if (!tokens) return 0;
	let total = 0;
	for (const v of Object.values(tokens)) total += v;
	return total;
}

/** Pretty-print a captured body. Bodies arrive as raw strings; if the string
 * is JSON we re-indent it, otherwise we hand it back verbatim. */
export function prettyBody(body: string | undefined): string {
	if (!body) return "";
	try {
		return JSON.stringify(JSON.parse(body), null, 2);
	} catch {
		return body;
	}
}

/** Short, monospace-friendly request id (first segment). */
export function shortId(requestId: string): string {
	return requestId.length > 12 ? `${requestId.slice(0, 12)}…` : requestId;
}
