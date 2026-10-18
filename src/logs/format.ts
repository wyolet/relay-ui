export { fmtInt, fmtMs, fmtTs, sumTokens } from "@/lib/format";

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

/** A row's time: the clock alone for today, the date and clock otherwise. */
export function fmtLogTime(iso: string, now: Date = new Date()): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const clock = d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	if (d.toDateString() === now.toDateString()) return clock;
	const day = d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
	return `${day}, ${clock}`;
}
