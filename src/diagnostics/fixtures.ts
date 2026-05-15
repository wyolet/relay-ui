import type { HostKey } from "@/api/types/hostkey";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import type { Provider } from "@/api/types/provider";
import type { RateLimit } from "@/api/types/ratelimit";
import type { RelayKey } from "@/api/types/relayKey";
import { buildDiagnosticGraph } from "@/diagnostics/buildGraph";
import type { DiagnosticGraph } from "@/diagnostics/types";

/**
 * Minimal builders used by analyzer unit tests. They produce just enough
 * shape to satisfy the typed entities; defaults err toward "everything
 * enabled, nothing broken" so a test only has to set what it cares about.
 */

interface PolicyOpts {
	id?: string;
	name?: string;
	enabled?: boolean;
	hostKeyIds?: string[];
	models?: string[];
	rateLimitId?: string;
	rlBindings?: { rateLimitId: string; models?: string[] }[];
}
export function makePolicy(o: PolicyOpts = {}): Policy {
	return {
		metadata: {
			id: o.id ?? "policy-1",
			name: o.name ?? "policy-1",
			owner: { kind: "user" },
		},
		spec: {
			enabled: o.enabled ?? true,
			hostKeyIds: o.hostKeyIds ?? [],
			models: o.models ?? [],
			rateLimitId: o.rateLimitId,
			rlBindings: o.rlBindings?.map((b) => ({
				rateLimitId: b.rateLimitId,
				models: b.models ?? null,
			})),
		},
	};
}

interface HostKeyOpts {
	id?: string;
	name?: string;
	hostId: string;
	policyId: string;
	enabled?: boolean;
}
export function makeHostKey(o: HostKeyOpts): HostKey {
	return {
		metadata: {
			id: o.id ?? `hk-${o.hostId}`,
			name: o.name ?? `hk-${o.hostId}`,
			owner: { kind: "user" },
		},
		spec: {
			hostId: o.hostId,
			policyId: o.policyId,
			enabled: o.enabled ?? true,
			valueFrom: { kind: "stored" },
		},
	};
}

interface HostOpts {
	id?: string;
	name: string;
	enabled?: boolean;
	defaultPolicy?: string;
}
export function makeHost(o: HostOpts): Host {
	return {
		metadata: {
			id: o.id ?? `host-${o.name}`,
			name: o.name,
		},
		spec: {
			baseURL: `https://${o.name}.example`,
			enabled: o.enabled ?? true,
			defaultPolicy: o.defaultPolicy,
		},
	};
}

interface ModelOpts {
	id?: string;
	name: string;
	providerId?: string;
	enabled?: boolean;
	deprecated?: boolean;
	bindings?: { hostId: string; enabled?: boolean }[];
}
export function makeModel(o: ModelOpts): Model {
	return {
		metadata: {
			id: o.id ?? `model-${o.name}`,
			name: o.name,
			owner: o.providerId
				? { kind: "provider", id: o.providerId }
				: undefined,
		},
		spec: {
			enabled: o.enabled ?? true,
			deprecation: o.deprecated ? { status: "deprecated" } : undefined,
			hosts: (o.bindings ?? []).map((b) => ({
				hostId: b.hostId,
				upstreamName: o.name,
				adapter: "openai",
				enabled: b.enabled ?? true,
			})),
		},
	};
}

interface RateLimitOpts {
	id?: string;
	name?: string;
	enabled?: boolean;
}
export function makeRateLimit(o: RateLimitOpts = {}): RateLimit {
	return {
		metadata: {
			id: o.id ?? "rl-1",
			name: o.name ?? "rl-1",
			owner: { kind: "user" },
		},
		spec: {
			enabled: o.enabled ?? true,
			rules: [
				{
					amount: 100,
					meter: "requests",
					strategy: "token-bucket",
					window: 60_000_000_000,
				},
			],
		},
	};
}

interface RelayKeyOpts {
	id?: string;
	name?: string;
	policyId: string;
	enabled?: boolean;
}
export function makeRelayKey(o: RelayKeyOpts): RelayKey {
	return {
		metadata: {
			id: o.id ?? "rk-1",
			name: o.name ?? "rk-1",
			owner: { kind: "user" },
		},
		spec: {
			enabled: o.enabled ?? true,
			keyHash: "hash",
			policyId: o.policyId,
		},
	};
}

interface ProviderOpts {
	id: string;
	name: string;
}
export function makeProvider(o: ProviderOpts): Provider {
	return {
		metadata: { id: o.id, name: o.name },
		spec: { enabled: true },
	};
}

interface GraphOpts {
	policies?: Policy[];
	hostKeys?: HostKey[];
	hosts?: Host[];
	models?: Model[];
	rateLimits?: RateLimit[];
	relayKeys?: RelayKey[];
	providers?: Provider[];
}
export function graph(o: GraphOpts = {}): DiagnosticGraph {
	return buildDiagnosticGraph({
		policies: o.policies ?? [],
		hostKeys: o.hostKeys ?? [],
		hosts: o.hosts ?? [],
		models: o.models ?? [],
		rateLimits: o.rateLimits ?? [],
		relayKeys: o.relayKeys ?? [],
		providers: o.providers ?? [],
	});
}
