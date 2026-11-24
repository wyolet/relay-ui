import type { components } from "@/api/types.gen";

type CreatedRow = components["schemas"]["CreatedRow"];

/** The parts every one-request answer carries in the same shape; kinds that only make rows omit `updated` and `deleted`. */
export type PseudoAnswer = Pick<
	components["schemas"]["PseudoAccessAnswer"],
	"created" | "updated" | "deleted" | "warnings"
>;

export type PlannedRowLists = Pick<
	PseudoAnswer,
	"created" | "updated" | "deleted"
>;

export interface PlannedGroup {
	heading: string;
	rows: readonly CreatedRow[];
}

const GROUP_HEADINGS = {
	created: "Makes",
	updated: "Changes",
	deleted: "Deletes",
} as const;

/** The answer's non-empty row lists, in made, changed, deleted order. */
export function plannedGroups(lists: PlannedRowLists): PlannedGroup[] {
	return (["created", "updated", "deleted"] as const).flatMap((key) => {
		const rows = lists[key] ?? [];
		return rows.length > 0 ? [{ heading: GROUP_HEADINGS[key], rows }] : [];
	});
}

const ROW_KIND_LABELS: Record<string, string> = {
	"service-account": "Service account",
	account: "Account",
	share: "Share",
	pool: "Pool",
	policy: "Policy",
	"policy-binding": "Policy binding",
	key: "Key",
	"host-key": "Host key",
	budget: "Budget",
	"rate-limit": "Rate limit",
};

/** A readable label for an API row kind; a kind not listed reads as relay sent it. */
export function rowKindLabel(kind: string): string {
	return ROW_KIND_LABELS[kind] ?? kind;
}
