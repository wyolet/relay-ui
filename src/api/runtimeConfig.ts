import type { components } from "./types.gen";

/**
 * Public runtime configuration, fetched once at boot from a single same-origin
 * document (`/config.json`) the deployment serves. This is the **single source
 * of truth** for per-deployment values (API URLs, mode, flags, …): the UI is
 * built once and embedded generically, so it cannot bake them at build time.
 *
 * Bootstrap (the one thing a static bundle can't know on its own): *where* to
 * fetch config from.
 *   - Dev: the bundle isn't served by relay, so `VITE_RUNTIME_CONFIG_URL` can
 *     point at the config document (or the dev server proxies `/config.json`).
 *   - Prod (embedded): no var shipped → `${origin}/config.json`, served by relay.
 *
 * Everything else comes from the fetched object, so dev and prod run the same
 * code path — no per-variable drift. On any fetch failure the UI degrades to
 * same-origin defaults rather than hard-failing (covers the embedded single
 * binary where the values equal the page origin anyway).
 */
export type RuntimeConfig = components["schemas"]["RuntimeConfig"];

let loaded: RuntimeConfig = {};

function pageOrigin(): string {
	return typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";
}

function configUrl(): string {
	const override = import.meta.env.VITE_RUNTIME_CONFIG_URL;
	return override ? override : `${pageOrigin()}/config.json`;
}

/**
 * Origin the config document is served from. Since the control API serves its
 * own `/config.json`, this *is* the control origin — so it's the right default
 * for `controlApiUrl`/`inferenceApiUrl` when the config omits them (the embedded
 * case where they equal the serving origin, and the dev case where config is
 * fetched cross-origin from the control host).
 */
function configOrigin(): string {
	try {
		return new URL(configUrl(), pageOrigin()).origin;
	} catch {
		return pageOrigin();
	}
}

/**
 * Fetch the runtime config once, at boot, before the app (and thus the API
 * client) is imported. Never throws — failures leave the defaults in place.
 */
export async function loadRuntimeConfig(): Promise<void> {
	try {
		const res = await fetch(configUrl(), { credentials: "omit" });
		if (res.ok) {
			loaded = (await res.json()) as RuntimeConfig;
		} else {
			console.warn(`runtime config: ${configUrl()} → ${res.status}`);
		}
	} catch (err) {
		console.warn("runtime config: fetch failed, using origin defaults", err);
	}
}

const trimSlash = (u: string): string => u.replace(/\/$/, "");

/** Control/admin API base. Defaults to the config doc's origin. */
export function controlApiUrl(): string {
	return trimSlash(loaded.controlApiUrl ?? configOrigin());
}

/** Data-plane / inference base (serves `/{adapter}/v1`). Defaults to config origin. */
export function inferenceApiUrl(): string {
	return trimSlash(loaded.inferenceApiUrl ?? configOrigin());
}

/** Deployment mode; unknown/absent values are treated as "oss". */
export function runtimeMode(): "oss" | "cloud" {
	return loaded.mode === "cloud" ? "cloud" : "oss";
}

/** A feature flag; absent = off. */
export function feature(key: string): boolean {
	return loaded.features?.[key] ?? false;
}

/** The whole config object — escape hatch for less-common fields. */
export function runtimeConfig(): Readonly<RuntimeConfig> {
	return loaded;
}
