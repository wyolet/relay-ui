import type {
	AgentRemoval,
	AgentRemovalAnswer,
	RemovalKept,
	RemovalRow,
} from "@/api/hooks/pseudoAgentRemovals";
import { ApiError } from "@/api/types/errors";
import { rowKindLabel } from "@/pseudo/dryRun";
import type { PointerFields } from "@/pseudo/pointerField";
import type { CheckOption } from "@/shared/MultiSelect";

/** The part of the removal a refusal's pointer names. */
export type RemovalField = "serviceAccount" | "keep" | "expect";

export const REMOVAL_POINTER_FIELDS: PointerFields<RemovalField> = {
	"/spec/serviceAccountId": "serviceAccount",
	"/spec/keep": "keep",
	"/spec/expect": "expect",
};

export const CHANGED_MESSAGE =
	"This changed while the dialog was open. Check the list again.";

const KEPT_REASONS: Record<RemovalKept["reason"], string> = {
	in_use: "used by something else",
	kept_by_request: "kept",
	not_deletable: "can't be deleted here",
};

/**
 * What relay says the removal deletes, in order, changes, and which labelled
 * rows stay; rows the caller may not read are only counted.
 */
export interface RemovalList {
	deleted: RemovalRow[];
	deletedHidden: number;
	updated: RemovalRow[];
	updatedHidden: number;
	kept: RemovalKept[];
	keptHidden: number;
}

type ListedAnswer = Pick<
	AgentRemovalAnswer,
	"deleted" | "deletedHidden" | "kept" | "keptHidden"
> &
	Partial<Pick<AgentRemovalAnswer, "updated" | "updatedHidden">>;

/** The lists from a dry run, or from a 409 `changed`, which answers no changed rows. */
export function removalList(answer: ListedAnswer): RemovalList {
	return {
		deleted: answer.deleted ?? [],
		deletedHidden: answer.deletedHidden ?? 0,
		updated: answer.updated ?? [],
		updatedHidden: answer.updatedHidden ?? 0,
		kept: answer.kept ?? [],
		keptHidden: answer.keptHidden ?? 0,
	};
}

/** relay refuses a caller who may not remove the agent before it lists anything. */
export function isRemovalDenied(err: unknown): boolean {
	return err instanceof ApiError && (err.status === 403 || err.status === 404);
}

/** "and N more you can't see" under a list; nothing at zero. */
export function hiddenRowsLine(count: number): string | undefined {
	return count > 0 ? `and ${count} more you can't see` : undefined;
}

/** The request body; `keep` is left out when empty and `expect` sent only with the removal itself. */
export function pseudoRemovalBody(
	serviceAccountId: string,
	keep: readonly string[],
	expect?: readonly RemovalRow[],
): AgentRemoval {
	return {
		spec: {
			serviceAccountId,
			...(keep.length > 0 ? { keep: [...keep] } : {}),
			...(expect ? { expect: expect.map((row) => row.id) } : {}),
		},
	};
}

function isLabelled(row: RemovalRow): boolean {
	return row.kind === "policy" || row.kind === "pool";
}

const KIND_ORDER = ["policy", "pool"];

function keptHint(
	reason: RemovalKept["reason"] | undefined,
): string | undefined {
	if (reason === undefined) return undefined;
	return reason === "kept_by_request"
		? "Kept"
		: `Kept: ${KEPT_REASONS[reason]}`;
}

/**
 * The policies and pools made for the agent: the deleted ones and those kept
 * by request can be ticked; a row kept for another reason is fixed. Ordered
 * by kind, then name, so a row stays in place as it moves between lists.
 */
export function removalOptions(
	list: RemovalList,
	refusedKeep?: { id: string; message: string },
): CheckOption[] {
	const rows = [
		...list.deleted.filter(isLabelled).map((row) => ({
			kind: row.kind,
			id: row.id,
			name: row.name,
			reason: undefined,
		})),
		...list.kept,
	];
	return rows
		.sort(
			(a, b) =>
				KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
				a.name.localeCompare(b.name),
		)
		.map((row) => ({
			value: row.id,
			label: `${rowKindLabel(row.kind)} ${row.name}`,
			hint: keptHint(row.reason),
			disabled: row.reason !== undefined && row.reason !== "kept_by_request",
			notes: refusedKeep?.id === row.id ? [refusedKeep.message] : undefined,
		}));
}

/** The keep entry a refusal at `/spec/keep/<i>` names. */
export function refusedKeepId(
	pointer: string,
	keep: readonly string[],
): string | undefined {
	const match = /^\/spec\/keep\/(\d+)$/.exec(pointer);
	return match ? keep[Number(match[1])] : undefined;
}
