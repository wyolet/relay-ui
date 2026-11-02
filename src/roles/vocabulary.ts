import type { components } from "@/api/types.gen";

type RoleRule = components["schemas"]["RoleRule"];

/** The closed sets a role rule may name, in picker order; the schema checks each entry. */
export const RULE_WILDCARD = "*";

export const RULE_KINDS = [
	"*",
	"accounts",
	"audit",
	"budgets",
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
	"pools",
	"pricings",
	"projects",
	"providers",
	"rate-limits",
	"role-bindings",
	"roles",
	"scim-clients",
	"secret-keys",
	"service-accounts",
	"settings",
	"system",
	"teams",
	"tokens",
	"usage",
	"users",
] as const satisfies readonly NonNullable<RoleRule["kinds"]>[number][];

export const RULE_VERBS = [
	"*",
	"apply",
	"attach",
	"create",
	"delete",
	"destroy",
	"detach",
	"generate",
	"get",
	"health",
	"list",
	"mint",
	"read",
	"reload",
	"revoke",
	"rewrap",
	"rotate",
	"snapshot",
	"update",
] as const satisfies readonly NonNullable<RoleRule["verbs"]>[number][];

/** Built-in roles are seeded with `owner.kind: system` and are read-only. */
export function isBuiltinRole(ownerKind: string | undefined): boolean {
	return ownerKind === "system";
}
