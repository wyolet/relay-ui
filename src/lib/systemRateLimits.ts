import type { RateLimit } from "@/api/types/ratelimit";

export const SYSTEM_RL_CONTROL = "control-api" as const;
export const SYSTEM_RL_INFERENCE = "inference-api" as const;
export const SYSTEM_RL_INFERENCE_PROXY = "inference-api-proxy" as const;
export const SYSTEM_RL_INFERENCE_PROXY_ANON =
	"inference-api-proxy-anonymous" as const;

export type SystemRateLimitName =
	| typeof SYSTEM_RL_CONTROL
	| typeof SYSTEM_RL_INFERENCE
	| typeof SYSTEM_RL_INFERENCE_PROXY
	| typeof SYSTEM_RL_INFERENCE_PROXY_ANON;

export const SYSTEM_RL_NAMES: readonly SystemRateLimitName[] = [
	SYSTEM_RL_CONTROL,
	SYSTEM_RL_INFERENCE,
	SYSTEM_RL_INFERENCE_PROXY,
	SYSTEM_RL_INFERENCE_PROXY_ANON,
] as const;

const SYSTEM_RL_SET: ReadonlySet<string> = new Set(SYSTEM_RL_NAMES);

/**
 * Owner kind constants. Prefer `metadata.owner.kind` once backend populates it
 * everywhere; the name fallback covers legacy rows.
 */
export const OWNER_KIND_SYSTEM = "system";
export const OWNER_KIND_PROVIDER = "provider";
export const OWNER_KIND_USER = "user";

export function isSystemOwned(rl: RateLimit): boolean {
	const ownerKind = rl.metadata.owner?.kind;
	if (ownerKind) return ownerKind === OWNER_KIND_SYSTEM;
	return SYSTEM_RL_SET.has(rl.metadata.name);
}

export function isProviderOwned(rl: RateLimit): boolean {
	return rl.metadata.owner?.kind === OWNER_KIND_PROVIDER;
}

export function isUserOwned(rl: RateLimit): boolean {
	return !isSystemOwned(rl) && !isProviderOwned(rl);
}

/** Kept for callers that match on raw name. */
export function isSystemRateLimitName(name: string): boolean {
	return SYSTEM_RL_SET.has(name);
}

/** @deprecated Use `isSystemOwned`. */
export const isSystemRateLimit = isSystemOwned;
