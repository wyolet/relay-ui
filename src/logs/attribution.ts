import type { LogEvent } from "@/api/hooks/logs";

/**
 * Which layer produced a failed request's verdict. Mirrors the relay's
 * X-WR-Origin semantics, derived from fields every historical event
 * already carries — so attribution works on old rows too:
 *
 * - no error_kind + status >= 400 → the upstream returned that status and
 *   the relay forwarded it unchanged (pass-through).
 * - error_kind set → the relay minted the error envelope; the kind says
 *   whose fault it records (upstream leg, relay's own gate, or the caller).
 */
export type FailureLayer = "relay" | "upstream" | "client";

export type FailureAttribution = {
	layer: FailureLayer;
	/** One-sentence plain-language explanation for the detail views. */
	reason: string;
};

const BY_KIND: Record<string, FailureAttribution> = {
	upstream_error: {
		layer: "upstream",
		reason:
			"The upstream call failed before any bytes reached the caller; the relay reported it.",
	},
	upstream_unreachable: {
		layer: "upstream",
		reason:
			"The relay could not reach the upstream host at all — a dial failure, not an upstream verdict.",
	},
	rate_limited: {
		layer: "relay",
		reason:
			"The relay's own rate limiter rejected the request before any upstream call.",
	},
	no_keys: {
		layer: "relay",
		reason: "No upstream key was configured for the resolved policy.",
	},
	keys_exhausted: {
		layer: "relay",
		reason:
			"Every candidate upstream key's circuit breaker was open — the relay refused rather than burn a failing key.",
	},
	adapter_missing: {
		layer: "relay",
		reason: "No adapter is registered for the resolved binding.",
	},
	policy_missing: {
		layer: "relay",
		reason: "The key resolved to no policy.",
	},
	no_upstream_auth: {
		layer: "client",
		reason:
			"The caller supplied no upstream Authorization for proxy mode — nothing was forwarded.",
	},
	client_canceled: {
		layer: "client",
		reason: "The caller disconnected before the request completed.",
	},
	timeout: {
		layer: "relay",
		reason: "A relay-side deadline expired before the request completed.",
	},
};

/**
 * Attribution for a failed event; null for successes. Unknown error kinds
 * fall back to layer "relay" — the relay wrote whatever verdict the kind
 * records, matching the server's X-WR-Origin default.
 */
export function failureAttribution(
	e: Pick<LogEvent, "status" | "error_kind">,
): FailureAttribution | null {
	if (e.error_kind) {
		return (
			BY_KIND[e.error_kind] ?? {
				layer: "relay",
				reason: "The relay rejected the request.",
			}
		);
	}
	if (e.status >= 400) {
		return {
			layer: "upstream",
			reason: `The upstream returned ${e.status} and the relay forwarded it unchanged.`,
		};
	}
	return null;
}
