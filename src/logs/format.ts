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
