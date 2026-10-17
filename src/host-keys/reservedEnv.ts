/** Env-name prefixes relay keeps for its own configuration. */
const RESERVED_PREFIXES = ["RELAY_", "WYOLET_"] as const;

/**
 * The reserved prefix an env var name starts with, case-insensitively, or
 * undefined. Relay refuses such references so a host key can't read its own
 * secrets (master key, admin password) out of the environment.
 */
export function reservedEnvPrefix(name: string): string | undefined {
	const upper = name.trim().toUpperCase();
	return RESERVED_PREFIXES.find((p) => upper.startsWith(p));
}
