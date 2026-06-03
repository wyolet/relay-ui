/**
 * The handful of providers the bootstrap wizard knows how to onboard. Hosts are
 * seeded by the relay deployment, so each entry carries a matcher that finds the
 * seeded host (by slug/name) rather than provisioning one. The card is shown
 * regardless; it's only selectable once `match` finds a seeded host.
 */
export type ProviderId = "openai" | "anthropic" | "gemini" | "ollama";

export interface ProviderDef {
	id: ProviderId;
	label: string;
	/** Single-letter badge fallback when no host icon is available. */
	monogram: string;
	/** Tailwind classes for the monogram badge (semantic-ish brand accents). */
	badgeClass: string;
	blurb: string;
	keyLabel: string;
	keyPlaceholder: string;
	/** Where to get a key — rendered as a small hint link under the field. */
	keyDocsUrl?: string;
	/** Ollama runs locally and needs a reachable base URL instead of a key. */
	local: boolean;
	defaultBaseURL?: string;
	/** Matches a seeded host's `metadata.name` (slug) to this provider. */
	match: (hostName: string) => boolean;
}

export const PROVIDERS: ProviderDef[] = [
	{
		id: "openai",
		label: "OpenAI",
		monogram: "O",
		badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
		blurb: "GPT-4o, o-series and embeddings.",
		keyLabel: "OpenAI API key",
		keyPlaceholder: "sk-…",
		keyDocsUrl: "https://platform.openai.com/api-keys",
		local: false,
		match: (n) => n.includes("openai"),
	},
	{
		id: "anthropic",
		label: "Anthropic",
		monogram: "A",
		badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
		blurb: "Claude Opus, Sonnet and Haiku.",
		keyLabel: "Anthropic API key",
		keyPlaceholder: "sk-ant-…",
		keyDocsUrl: "https://console.anthropic.com/settings/keys",
		local: false,
		match: (n) => n.includes("anthropic") || n.includes("claude"),
	},
	{
		id: "gemini",
		label: "Gemini",
		monogram: "G",
		badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
		blurb: "Google Gemini 1.5 / 2.x models.",
		keyLabel: "Google AI API key",
		keyPlaceholder: "AIza…",
		keyDocsUrl: "https://aistudio.google.com/app/apikey",
		local: false,
		match: (n) => n.includes("gemini") || n.includes("google"),
	},
	{
		id: "ollama",
		label: "Ollama",
		monogram: "L",
		badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
		blurb: "Local models — Llama, Mistral, Qwen…",
		keyLabel: "API key (optional)",
		keyPlaceholder: "leave blank for unauthenticated Ollama",
		local: true,
		// Containers can't reach the host's loopback; host.docker.internal is the
		// Docker Desktop bridge. Native-Linux users swap in their host IP.
		defaultBaseURL: "http://host.docker.internal:11434",
		match: (n) => n.includes("ollama"),
	},
];

export function providerById(id: ProviderId): ProviderDef {
	const found = PROVIDERS.find((p) => p.id === id);
	// PROVIDERS is exhaustive over ProviderId, so this is total.
	if (!found) throw new Error(`unknown provider: ${id}`);
	return found;
}
