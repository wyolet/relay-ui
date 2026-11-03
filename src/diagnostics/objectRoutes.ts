/** Detail route per relay object kind, as the plan engine names kinds; each takes the slug. */
export const OBJECT_ROUTES = {
	account: "/accounts/$name",
	budget: "/policies/budgets/$name",
	credential: "/host-keys/$name",
	group: "/groups/$name",
	host: "/hosts/$name",
	key: "/keys/$name",
	model: "/models/$name",
	policy: "/policies/$name",
	policybinding: "/policy-bindings/$name",
	pool: "/pools/$name",
	pricing: "/pricing/$name",
	project: "/projects/$name",
	provider: "/providers/$name",
	ratelimit: "/policies/rate-limits/$name",
	role: "/roles/$name",
	rolebinding: "/role-bindings/$name",
	serviceaccount: "/service-accounts/$name",
	team: "/teams/$name",
} as const;

export type ObjectKind = keyof typeof OBJECT_ROUTES;
export type ObjectRoute = (typeof OBJECT_ROUTES)[ObjectKind];

const OBJECT_LABELS: Record<ObjectKind, string> = {
	account: "Account",
	budget: "Budget",
	credential: "Credential",
	group: "Group",
	host: "Host",
	key: "Key",
	model: "Model",
	policy: "Policy",
	policybinding: "Policy binding",
	pool: "Pool",
	pricing: "Pricing",
	project: "Project",
	provider: "Provider",
	ratelimit: "Rate limit",
	role: "Role",
	rolebinding: "Role binding",
	serviceaccount: "Service account",
	team: "Team",
};

export function isObjectKind(kind: string): kind is ObjectKind {
	return Object.hasOwn(OBJECT_ROUTES, kind);
}

/** The detail route for a kind; undefined for kinds the UI has no page for. */
export function objectRoute(kind: string): ObjectRoute | undefined {
	return isObjectKind(kind) ? OBJECT_ROUTES[kind] : undefined;
}

/** "Policy", "Rate limit", …; the raw kind for engine-internal kinds. */
export function objectLabel(kind: string): string {
	return isObjectKind(kind) ? OBJECT_LABELS[kind] : kind;
}
