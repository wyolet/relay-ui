import { useQueries } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import { unwrap } from "@/api/unwrap";

/** Kinds whose nav entry disappears when the actor may not list them. */
export type Capability =
	| "models"
	| "keys"
	| "policies"
	| "pricings"
	| "teams"
	| "projects"
	| "service-accounts"
	| "groups"
	| "roles"
	| "role-bindings"
	| "policy-bindings"
	| "users"
	| "audit";

/**
 * The cheapest call that answers "may this actor list the kind?" — one row,
 * discarded. A page's own list query stays separate: it carries filters and
 * paging, and re-running it here would fetch the whole first page twice.
 */
const PROBE: Record<Capability, () => Promise<unknown>> = {
	models: async () =>
		unwrap(await apiClient.GET("/models", { params: { query: { limit: 1 } } })),
	keys: async () =>
		unwrap(await apiClient.GET("/keys", { params: { query: { limit: 1 } } })),
	policies: async () =>
		unwrap(
			await apiClient.GET("/policies", { params: { query: { limit: 1 } } }),
		),
	pricings: async () =>
		unwrap(
			await apiClient.GET("/pricings", { params: { query: { limit: 1 } } }),
		),
	teams: async () =>
		unwrap(await apiClient.GET("/teams", { params: { query: { limit: 1 } } })),
	projects: async () =>
		unwrap(
			await apiClient.GET("/projects", { params: { query: { limit: 1 } } }),
		),
	"service-accounts": async () =>
		unwrap(
			await apiClient.GET("/service-accounts", {
				params: { query: { limit: 1 } },
			}),
		),
	groups: async () =>
		unwrap(await apiClient.GET("/groups", { params: { query: { limit: 1 } } })),
	roles: async () =>
		unwrap(await apiClient.GET("/roles", { params: { query: { limit: 1 } } })),
	"role-bindings": async () =>
		unwrap(
			await apiClient.GET("/role-bindings", {
				params: { query: { limit: 1 } },
			}),
		),
	"policy-bindings": async () =>
		unwrap(
			await apiClient.GET("/policy-bindings", {
				params: { query: { limit: 1 } },
			}),
		),
	// /users takes no query params — the list is small and admin-only anyway.
	users: async () => unwrap(await apiClient.GET("/users")),
	audit: async () =>
		unwrap(await apiClient.GET("/audit", { params: { query: { limit: 1 } } })),
};

const CAPABILITIES = Object.keys(PROBE) as Capability[];

/** Query key prefix; `useAuth().login` drops the branch so a new session
 * re-probes rather than inheriting the previous actor's answers. */
export const CAPABILITIES_KEY = "capabilities";

/**
 * Whether the actor may list each kind, probed once per session. Admins skip
 * the probes entirely — they can list everything. A probe still in flight
 * counts as allowed, so the nav renders complete and only ever loses entries.
 */
export function useCapabilities(): Record<Capability, boolean> {
	const { authenticated, isAdmin } = useAuth();

	return useQueries({
		queries: CAPABILITIES.map((kind) => ({
			queryKey: [CAPABILITIES_KEY, kind] as const,
			queryFn: PROBE[kind],
			enabled: authenticated && !isAdmin,
			// A permission answer holds for the session; 403 is permanent.
			staleTime: Number.POSITIVE_INFINITY,
			gcTime: Number.POSITIVE_INFINITY,
			retry: false,
		})),
		combine: (results) =>
			Object.fromEntries(
				CAPABILITIES.map((kind, i) => [
					kind,
					!(
						results[i].error instanceof ApiError &&
						results[i].error.status === 403
					),
				]),
			) as Record<Capability, boolean>,
	});
}
