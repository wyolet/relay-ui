import type { components } from "@/api/types.gen";
import {
	type FieldIssue,
	issuesByField,
	type PointerFields,
} from "@/pseudo/pointerField";

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

export const HIDDEN_ROW_WARNING = "A row you can't see gets a warning.";

/** A dry run's warnings by the field their pointer names. */
export function dryRunWarnings<F extends string>(
	answer: Pick<PseudoAnswer, "warnings">,
	fields: PointerFields<F>,
): FieldIssue<F>[] {
	return issuesByField(answer.warnings ?? [], fields, HIDDEN_ROW_WARNING);
}

/** Each warning's message once, in order. */
export function warningMessages<F extends string>(
	warnings: readonly FieldIssue<F>[],
): string[] {
	return [...new Set(warnings.map((w) => w.message))];
}

/** Each warned field's first message, for the fields `unchanged` says still hold what the dry run was asked with. */
export function warnedFields<F extends string>(
	warnings: readonly FieldIssue<F>[],
	unchanged: (field: F) => boolean,
): Partial<Record<F, string>> {
	const marks: Partial<Record<F, string>> = {};
	for (const { field, message } of warnings) {
		if (field !== undefined && unchanged(field)) marks[field] ??= message;
	}
	return marks;
}
