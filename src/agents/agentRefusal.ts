import { PseudoRefusal } from "@/api/types/errors";
import { failureMessage } from "@/hooks/useWriteRunner";

/** The form field a part of the `POST /pseudo-agents` body comes from; `access` is the access step as a whole. */
export type RefusalField =
	| "displayName"
	| "projectId"
	| "accountIds"
	| "poolIds"
	| "access"
	| "policyId"
	| "keyName";

// Most specific first: a pointer belongs to the first prefix it starts with.
const POINTER_FIELDS: readonly (readonly [string, RefusalField])[] = [
	["/metadata/owner", "projectId"],
	["/metadata", "displayName"],
	["/spec/access/accountIds", "accountIds"],
	["/spec/access/poolIds", "poolIds"],
	["/spec/access", "access"],
	["/spec/policyId", "policyId"],
	["/spec/key", "keyName"],
];

/** The field a JSON Pointer into the request body names; none for "" or a part the form doesn't hold. */
export function pointerField(pointer: string): RefusalField | undefined {
	return POINTER_FIELDS.find(
		([prefix]) => pointer === prefix || pointer.startsWith(`${prefix}/`),
	)?.[1];
}

export const HIDDEN_ROW_ISSUE = "A row you can't see blocks this.";
export const CONFLICT_MESSAGE = "Something changed while saving. Try again.";
/** 503: relay's plans are still loading, or another check is running; nothing was written. */
export const BUSY_MESSAGE = "Relay is busy. Try again in a moment.";

export interface RefusalIssue {
	/** Unset for a row that exists already: it has no part in the body. */
	field?: RefusalField;
	message: string;
}

/** Why relay refused the agent, sorted by where the form shows it. */
export type AgentRefusal =
	| { kind: "field"; field: RefusalField; message: string }
	| { kind: "issues"; issues: RefusalIssue[] }
	| { kind: "general"; message: string };

export function agentRefusal(err: unknown): AgentRefusal {
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
			issues: err.issues.map((issue) => {
				const field = pointerField(issue.pointer ?? "");
				const message = issue.message || HIDDEN_ROW_ISSUE;
				return field ? { field, message } : { message };
			}),
		};
	}
	const field = pointerField(err.pointer);
	const message = failureMessage(err);
	return field
		? { kind: "field", field, message }
		: { kind: "general", message };
}
