import { subjectKey } from "@/api/hooks/policyBindings";
import { ApiError } from "@/api/types/errors";
import type {
	PolicyBinding,
	PolicyBindingSubject,
	PolicyBindingSubjectKind,
} from "@/api/types/policyBinding";

/** Every subject kind the server may answer with. */
export const SUBJECT_KINDS = [
	"user",
	"serviceaccount",
	"team",
	"project",
	"account",
	"host",
	"credential",
] as const satisfies readonly PolicyBindingSubjectKind[];

/** The kinds the form offers; host and credential subjects only display. */
export const OFFERED_SUBJECT_KINDS = [
	"user",
	"serviceaccount",
	"team",
	"project",
	"account",
] as const satisfies readonly PolicyBindingSubjectKind[];

export type OfferedSubjectKind = (typeof OFFERED_SUBJECT_KINDS)[number];

export const SUBJECT_KIND_LABEL: Record<PolicyBindingSubjectKind, string> = {
	user: "User",
	serviceaccount: "Service account",
	team: "Team",
	project: "Project",
	account: "Account",
	host: "Host",
	credential: "Host key",
};

export function toOfferedKind(
	value: string | null,
): OfferedSubjectKind | undefined {
	return OFFERED_SUBJECT_KINDS.find((k) => k === value);
}

export function isOfferedKind(
	kind: PolicyBindingSubjectKind,
): kind is OfferedSubjectKind {
	return toOfferedKind(kind) !== undefined;
}

/** A subject while it is edited; `rowId` keys the row before it has a value. */
export interface SubjectRow {
	rowId: string;
	kind: PolicyBindingSubjectKind;
	/** The subject's id. */
	value: string;
}

export function newSubjectRow(
	kind: PolicyBindingSubjectKind = "serviceaccount",
	value = "",
): SubjectRow {
	return { rowId: crypto.randomUUID(), kind, value };
}

export function toSubjectRows(
	subjects: readonly PolicyBindingSubject[] | null | undefined,
): SubjectRow[] {
	return (subjects ?? []).map((s) => newSubjectRow(s.kind, s.id));
}

export function fromSubjectRows(
	rows: readonly SubjectRow[],
): PolicyBindingSubject[] {
	return rows
		.filter((r) => r.value.trim().length > 0)
		.map((r) => ({ kind: r.kind, id: r.value.trim() }));
}

export function subjectRowKey(row: SubjectRow): string {
	return subjectKey({ kind: row.kind, id: row.value.trim() });
}

/** The principal a relay key acts as. */
export interface BindingPrincipal {
	kind: Extract<PolicyBindingSubjectKind, "user" | "serviceaccount">;
	id: string;
}

function namesSubject(
	binding: PolicyBinding,
	subject: PolicyBindingSubject,
): boolean {
	return (binding.spec.subjects ?? []).some(
		(s) => s.kind === subject.kind && s.id === subject.id,
	);
}

/**
 * The binding that governs a principal's relay keys. A user's keys follow
 * only a system-owned binding or the user's own; team and project bindings
 * of a user govern that scope's inference tokens.
 */
export function principalBinding(
	bindings: readonly PolicyBinding[],
	principal: BindingPrincipal,
): PolicyBinding | undefined {
	return bindings.find((b) => {
		if (!namesSubject(b, principal)) return false;
		if (principal.kind !== "user") return true;
		const owner = b.metadata.owner?.kind;
		return owner === "system" || owner === "user";
	});
}

export function isDuplicateBinding(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "duplicate_binding"
	);
}

export interface DuplicateSubject {
	/** "<kind>:<id>" of the refused subject, when the message names it. */
	subjectKey: string | undefined;
	message: string;
}

/**
 * A duplicate_binding message with its leading "<kind>:<id>" swapped for
 * a readable label; `label` resolves the key, undefined keeps it raw.
 */
export function describeDuplicate(
	message: string,
	label: (subjectKey: string) => string | undefined,
): DuplicateSubject {
	const match = /^([a-z]+:\S+) is already bound/.exec(message);
	const subjectKey = match?.[1];
	if (!subjectKey) return { subjectKey: undefined, message };
	const name = label(subjectKey);
	return {
		subjectKey,
		message: name ? `${name}${message.slice(subjectKey.length)}` : message,
	};
}

export interface SubjectOption {
	value: string;
	label: string;
}

/** A kind's options, plus the row's current value when no list holds it. */
export function optionsWithValue(
	options: readonly SubjectOption[],
	value: string,
	label: string,
): SubjectOption[] {
	if (value === "" || options.some((o) => o.value === value))
		return [...options];
	return [{ value, label }, ...options];
}
