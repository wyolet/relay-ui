import type { RateLimit } from "@/api/types/ratelimit";
import {
	SYSTEM_RL_INFERENCE,
	SYSTEM_RL_INFERENCE_PROXY,
	SYSTEM_RL_INFERENCE_PROXY_ANON,
} from "@/lib/systemRateLimits";
import { nsToSec } from "@/lib/timeWindow";

export interface SystemReqCap {
	amount: number;
	windowSec: number;
}

export interface SystemEnforcementCtx {
	proxyEnabled: boolean;
	proxyAllowUnauthenticated: boolean;
}

function isActiveInferenceRL(
	name: string,
	ctx: SystemEnforcementCtx,
): boolean {
	if (name === SYSTEM_RL_INFERENCE) return true;
	if (name === SYSTEM_RL_INFERENCE_PROXY) return ctx.proxyEnabled;
	if (name === SYSTEM_RL_INFERENCE_PROXY_ANON)
		return ctx.proxyEnabled && ctx.proxyAllowUnauthenticated;
	return false;
}

/**
 * Pick the tightest enabled inference-family system `requests` rule, expressed
 * as amount/windowSec. Tightness is compared by rate (amount/window) using
 * cross-multiplication, so we never round through floats.
 *
 * Skips proxy-family RLs whose enforcement path is currently inactive — proxy
 * mode disabled means `inference-api-proxy` isn't actually applied at runtime,
 * so its stored cap shouldn't constrain user RLs.
 */
export function tightestRequestCap(
	systemRLs: RateLimit[],
	ctx: SystemEnforcementCtx,
): SystemReqCap | undefined {
	let tightest: SystemReqCap | undefined;
	for (const rl of systemRLs) {
		if (!isActiveInferenceRL(rl.metadata.name, ctx)) continue;
		if (rl.spec.enabled === false) continue;
		for (const r of rl.spec.rules ?? []) {
			if (r.meter !== "requests") continue;
			const windowSec = nsToSec(r.window);
			if (windowSec <= 0 || r.amount <= 0) continue;
			if (!tightest) {
				tightest = { amount: r.amount, windowSec };
				continue;
			}
			if (r.amount * tightest.windowSec < tightest.amount * windowSec) {
				tightest = { amount: r.amount, windowSec };
			}
		}
	}
	return tightest;
}

export function exceedsCap(
	amount: number,
	windowSec: number,
	cap: SystemReqCap,
): boolean {
	return amount * cap.windowSec > cap.amount * windowSec;
}

export function maxAmountForWindow(
	windowSec: number,
	cap: SystemReqCap,
): number {
	return Math.floor((cap.amount * windowSec) / cap.windowSec);
}

/**
 * Validate a user `requests` rule against a system cap.
 * Returns a human-readable error, or `undefined` when it fits.
 */
export function validateRequestRate(
	amount: number,
	windowSec: number,
	cap: SystemReqCap | undefined,
): string | undefined {
	if (!cap) return undefined;
	if (!Number.isFinite(amount) || !Number.isFinite(windowSec)) return undefined;
	if (amount <= 0 || windowSec <= 0) return undefined;
	if (!exceedsCap(amount, windowSec, cap)) return undefined;
	const max = maxAmountForWindow(windowSec, cap);
	return `Exceeds system limit of ${cap.amount} per ${cap.windowSec}s. Max here: ${max} per ${windowSec}s.`;
}
