import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

export type AccessReview = components["schemas"]["accessReview"];
type NamedRef = components["schemas"]["namedRef"];

const KIND_LABEL: Record<string, string> = {
	serviceaccount: "service account",
};

/** A ref as "<kind> <name>"; the system scope reads "global". */
export function describeRef(ref: {
	kind: string;
	name?: string;
	id?: string;
}): string {
	if (ref.kind === "system") return "global";
	const kind = KIND_LABEL[ref.kind] ?? ref.kind;
	const label = ref.name || ref.id;
	return label ? `${kind} ${label}` : kind;
}

/** Relay's rule slugs (`personal-row`) as words. */
export function describeRule(rule: string): string {
	return rule.replaceAll("-", " ");
}

/**
 * The decision in plain words, worded like relay's `auth can-i`: what granted
 * or refused it, never the verdict itself (the caller shows allowed/denied).
 */
export function describeDecision(review: AccessReview): string {
	const { binding, rule, reason, subject } = review;
	const granted = binding
		? `role binding ${binding.name || binding.id || "?"} grants ${binding.role.name || binding.role.id || "?"} at ${describeRef(binding.scope)} to ${describeRef(binding.subject)}`
		: rule
			? `relay rule: ${describeRule(rule)}`
			: "";
	switch (reason) {
		case "admin":
			return `${subject.name || "this subject"} is an admin, which passes every rule and role binding`;
		case "rule":
		case "binding":
			return granted;
		case "credential":
			return `${granted || "the role allows it"}, but the credential's limits refuse it`;
		default:
			return "no rule or role binding grants it";
	}
}

/** The scope chain, most specific first: "project ml → team platform → global". */
export function describeChain(chain: NamedRef[] | null | undefined): string {
	return (chain ?? []).map(describeRef).join(" → ");
}

/** Why a check produced no answer. `needs-rbac` is the 501 single mode gives. */
export type AccessCheckFailure =
	| { kind: "needs-rbac" }
	| { kind: "not-found"; message: string }
	| { kind: "other"; message: string };

export function accessCheckFailure(
	err: unknown,
): AccessCheckFailure | undefined {
	if (!err) return undefined;
	if (err instanceof ApiError) {
		if (err.status === 501) return { kind: "needs-rbac" };
		if (err.status === 404) return { kind: "not-found", message: err.message };
		return { kind: "other", message: err.message };
	}
	return { kind: "other", message: "The access check failed." };
}
