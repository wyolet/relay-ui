/**
 * Mock keys store — placeholder until /control/keys/* lands on the backend.
 * When the API is ready, replace this with TanStack Query hooks.
 */
import { create } from "zustand";

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	createdAt: string;
	lastUsedAt: string | null;
	revokedAt: string | null;
}

interface KeysState {
	items: ApiKey[];
	freshSecrets: Record<string, string>;
	createKey: (name: string) => { id: string; secret: string };
	revoke: (id: string) => void;
	clearSecret: (id: string) => void;
}

function rand(len: number): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let out = "";
	for (let i = 0; i < len; i += 1) {
		out += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return out;
}

function newId(): string {
	return rand(12);
}

function newSecret(): { secret: string; prefix: string } {
	const tail = rand(40);
	const prefix = `rly_sk_${tail.slice(0, 6)}`;
	return { secret: `rly_sk_${tail}`, prefix };
}

const seed: ApiKey[] = [
	{
		id: "abc123",
		name: "prod-app",
		prefix: "rly_sk_a3f9d2",
		createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
		lastUsedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
		revokedAt: null,
	},
	{
		id: "def456",
		name: "staging",
		prefix: "rly_sk_b81c7e",
		createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
		lastUsedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
		revokedAt: null,
	},
	{
		id: "ghi789",
		name: "local-dev",
		prefix: "rly_sk_5e2af1",
		createdAt: new Date().toISOString(),
		lastUsedAt: null,
		revokedAt: null,
	},
];

export const useKeysStore = create<KeysState>((set) => ({
	items: seed,
	freshSecrets: {},
	createKey: (name) => {
		const id = newId();
		const { secret, prefix } = newSecret();
		const next: ApiKey = {
			id,
			name,
			prefix,
			createdAt: new Date().toISOString(),
			lastUsedAt: null,
			revokedAt: null,
		};
		set((s) => ({
			items: [next, ...s.items],
			freshSecrets: { ...s.freshSecrets, [id]: secret },
		}));
		return { id, secret };
	},
	revoke: (id) =>
		set((s) => ({
			items: s.items.map((k) =>
				k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
			),
		})),
	clearSecret: (id) =>
		set((s) => {
			const next = { ...s.freshSecrets };
			delete next[id];
			return { freshSecrets: next };
		}),
}));
