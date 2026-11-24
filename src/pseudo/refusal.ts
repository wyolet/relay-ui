import { PseudoRefusal } from "@/api/types/errors";
import { failureMessage } from "@/hooks/useWriteRunner";
import {
	type FieldIssue,
	issuesByField,
	type PointerFields,
	pointerField,
} from "@/pseudo/pointerField";

export const HIDDEN_ROW_ISSUE = "A row you can't see blocks this.";
export const CONFLICT_MESSAGE = "Something changed while saving. Try again.";
/** 503: relay's plans are still loading, or another check is running; nothing was written. */
export const BUSY_MESSAGE = "Relay is busy. Try again in a moment.";

/** Why relay refused a one-request write, sorted by where the form shows it. */
export type Refusal<F extends string> =
	| { kind: "field"; field: F; message: string }
	| { kind: "issues"; issues: FieldIssue<F>[] }
	| { kind: "general"; message: string };

/** Sorts a failed one-request write by the form field its pointer names; a refusal without `error.code` still has status and pointer. */
export function parseRefusal<F extends string>(
	err: unknown,
	fields: PointerFields<F>,
): Refusal<F> {
	if (!(err instanceof PseudoRefusal)) {
		return { kind: "general", message: failureMessage(err) };
	}
	if (err.status === 503) return { kind: "general", message: BUSY_MESSAGE };
	if (err.status === 409 && err.body.code === "conflict") {
		return { kind: "general", message: CONFLICT_MESSAGE };
	}
	if (err.body.code === "plan_issue" && err.issues.length > 0) {
		return {
			kind: "issues",
			issues: issuesByField(err.issues, fields, HIDDEN_ROW_ISSUE),
		};
	}
	const field = pointerField(err.pointer, fields);
	const message = failureMessage(err);
	return field
		? { kind: "field", field, message }
		: { kind: "general", message };
}
