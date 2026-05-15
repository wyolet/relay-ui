import type { HostKey } from "@/api/types/hostkey";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";
import type { RelayKey } from "@/api/types/relayKey";

export type Severity = "error" | "warn" | "info";

export type DiagCode =
	// Relay Key
	| "relay-key.policy-dangling"
	| "relay-key.policy-broken"
	| "relay-key.policy-disabled"
	| "relay-key.disabled"
	// Policy
	| "policy.no-host-keys"
	| "policy.host-keys-all-disabled"
	| "policy.host-disabled-transitive"
	| "policy.catalog-resolves-empty"
	| "policy.host-keys-degraded"
	| "policy.rate-limit-disabled"
	| "policy.rl-binding-dead"
	| "policy.disabled-with-relay-keys"
	| "policy.no-relay-keys"
	// Host Key
	| "host-key.host-dangling"
	| "host-key.host-policy-dangling"
	| "host-key.host-disabled"
	| "host-key.host-policy-disabled"
	| "host-key.orphan"
	| "host-key.disabled"
	// Host
	| "host.disabled-with-refs"
	| "host.default-policy-dangling"
	| "host.no-keys"
	| "host.no-bindings"
	// Model
	| "model.all-hosts-unreachable"
	| "model.deprecated"
	| "model.all-bindings-disabled"
	| "model.disabled-with-grants"
	// Rate Limit
	| "rate-limit.disabled-with-refs"
	| "rate-limit.orphan"
	| "rate-limit.disabled";

export interface DiagLink {
	to: string;
	params?: Record<string, string>;
}

export interface Diagnostic {
	severity: Severity;
	code: DiagCode;
	message: string;
	link?: DiagLink;
}

export interface DiagnosticGraph {
	policies: ReadonlyMap<string, Policy>;
	hostKeys: ReadonlyMap<string, HostKey>;
	hosts: ReadonlyMap<string, Host>;
	models: ReadonlyMap<string, Model>;
	rateLimits: ReadonlyMap<string, RateLimit>;
	relayKeys: ReadonlyMap<string, RelayKey>;
	providers: ReadonlyMap<string, Provider>;
	// Reverse indexes
	relayKeysByPolicyId: ReadonlyMap<string, RelayKey[]>;
	policiesByHostKeyId: ReadonlyMap<string, Policy[]>;
	policiesByRateLimitId: ReadonlyMap<string, Policy[]>;
}

export const SEVERITY_RANK: Record<Severity, number> = {
	info: 0,
	warn: 1,
	error: 2,
};

export function worstSeverity(diagnostics: Diagnostic[]): Severity | undefined {
	if (diagnostics.length === 0) return undefined;
	let worst: Severity = "info";
	for (const d of diagnostics) {
		if (SEVERITY_RANK[d.severity] > SEVERITY_RANK[worst]) worst = d.severity;
	}
	return worst;
}
