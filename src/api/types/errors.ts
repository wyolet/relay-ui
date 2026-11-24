import type { components } from "@/api/types.gen";
import { ACCOUNT_DISABLED } from "@/lib/signInError";

/** Standard error inner shape returned by the Relay backend. */
export type ApiErrorBody = components["schemas"]["APIErrorBody"];

/** The rows still referencing a delete target, grouped by kind and field. */
export type BlockerGroup = components["schemas"]["blockerGroup"];

/** Links a delete took from rows that stay, grouped by policy field. */
export type DetachedLinks = components["schemas"]["DetachedLinks"];

/** Top-level error envelope; a 409 may carry the blockers beside the error. */
export type ApiErrorResponse =
	| components["schemas"]["APIError"]
	| components["schemas"]["conflictBody"];

export class ApiError extends Error {
	readonly status: number;
	readonly body: ApiErrorBody;
	readonly blockers: BlockerGroup[];

	constructor(
		status: number,
		body: ApiErrorBody,
		blockers?: BlockerGroup[] | null,
	) {
		super(body.message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
		this.blockers = blockers ?? [];
	}
}

export type PseudoRefusalBody = components["schemas"]["pseudoRefusal"];
export type PseudoIssue = components["schemas"]["PseudoIssue"];

/** A refused one-request write; nothing was written. */
export class PseudoRefusal extends ApiError {
	/** JSON Pointer into the request body naming the refused part; "" when relay names none. */
	readonly pointer: string;
	/** With `plan_issue`: what the rows would break together. */
	readonly issues: PseudoIssue[];

	constructor(status: number, body: PseudoRefusalBody) {
		super(status, body.error);
		this.name = "PseudoRefusal";
		this.pointer = body.pointer ?? "";
		this.issues = body.issues ?? [];
	}
}

/** A delete refused because other rows still reference the target. */
export function isResourceInUse(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "resource_in_use"
	);
}
/** Relay refused the signed-in account itself; it has already ended the session. */
export function isAccountDisabled(err: unknown): err is ApiError {
	return err instanceof ApiError && err.body.code === ACCOUNT_DISABLED;
}

/** A share refused because the receiver already holds a share of the account. */
export function isShareExists(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "share_exists"
	);
}

/** An update refused because the row changed after the caller loaded it. */
export function isStaleResourceVersion(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		err.body.code === "stale_resource_version"
	);
}
