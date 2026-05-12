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

export function isSystemRateLimit(rl: RateLimit): boolean {
	return SYSTEM_RL_SET.has(rl.metadata.name);
}

export function isSystemRateLimitName(name: string): boolean {
	return SYSTEM_RL_SET.has(name);
}
