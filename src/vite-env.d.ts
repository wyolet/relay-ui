/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** relay-ui release version, injected at build time (git tag, package.json, or "dev"). */
	readonly VITE_UI_VERSION: string;
	/**
	 * Bootstrap override for *where* to fetch runtime config from. Dev only —
	 * prod (embedded) reads `${origin}/config.json`. All other per-deployment
	 * values come from that config document, not from env. See runtimeConfig.ts.
	 */
	readonly VITE_RUNTIME_CONFIG_URL?: string;
	/**
	 * Dev-only override for the control API base, taking precedence over the
	 * config document. Escape hatch for when the doc advertises a stale base
	 * (e.g. a backend that moved its routes under /api but still returns the
	 * bare origin). Never set in prod builds. See runtimeConfig.ts.
	 */
	readonly VITE_CONTROL_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
