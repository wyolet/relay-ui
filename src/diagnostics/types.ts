import type { Binding } from "@/api/hooks/bindings";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Key } from "@/api/types/key";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";

export type Severity = "error" | "warn" | "info";

export type DiagCode =
	// Relay Key
	| "key.policy-dangling"
	| "key.policy-broken"
	| "key.policy-disabled"
	| "key.disabled"
	// Policy
	| "policy.no-host-keys"
	| "policy.host-keys-all-disabled"
	| "policy.host-disabled-transitive"
	| "policy.catalog-resolves-empty"
	| "policy.host-keys-degraded"
	| "policy.rate-limit-disabled"
	| "policy.rl-binding-dead"
	| "policy.host-keys-outside-catalog"
	| "policy.models-unthrottled"
	| "policy.disabled-with-keys"
	| "policy.no-keys"
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
	keys: ReadonlyMap<string, Key>;
	providers: ReadonlyMap<string, Provider>;
	// Host-bindings, indexed both ways (a model is served on a host via a binding).
	bindingsByModel: ReadonlyMap<string, Binding[]>;
	bindingsByHost: ReadonlyMap<string, Binding[]>;
	// Reverse indexes
	keysByPolicyId: ReadonlyMap<string, Key[]>;
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
