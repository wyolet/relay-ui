/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** relay-ui release version, injected at build time (git tag, package.json, or "dev"). */
	readonly VITE_UI_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
