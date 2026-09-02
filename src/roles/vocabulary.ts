/**
 * The closed sets a role rule may name. The OpenAPI schema types both as plain
 * strings, so they are mirrored from the server's source of truth — the `Kinds`
 * and `Verbs` vars in relay's `app/role/role.go`.
 */

export const RULE_WILDCARD = "*";

export const RULE_KINDS = [
	"*",
	"audit",
	"debug",
	"groups",
	"host-bindings",
	"host-keys",
	"hosts",
	"keys",
	"license",
	"logs",
	"master-key",
	"models",
	"policies",
	"policy-bindings",
	"pricings",
	"projects",
	"providers",
	"rate-limits",
	"role-bindings",
	"roles",
	"service-accounts",
	"settings",
	"system",
	"teams",
	"tokens",
	"usage",
	"users",
] as const;

export const RULE_VERBS = [
	"*",
	"apply",
	"attach",
	"create",
	"delete",
	"detach",
	"generate",
	"get",
	"health",
	"list",
	"mint",
	"read",
	"reload",
	"rotate",
	"snapshot",
	"update",
] as const;

/** Built-in roles are seeded with `owner.kind: system` and are read-only. */
export function isBuiltinRole(ownerKind: string | undefined): boolean {
	return ownerKind === "system";
}
