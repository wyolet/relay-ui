import type { AccessTarget } from "@/access/accessTarget";
import type { SavedAccess } from "@/access/useSetAccessWrites";
import type {
	AccessCase,
	PolicyCurrent,
	PseudoAccess,
	PseudoAccessAnswer,
} from "@/api/hooks/pseudoAccess";
import { required } from "@/lib/required";
import type { PointerFields } from "@/pseudo/pointerField";
import { isPolicySetAbove, parseRefusal, type Refusal } from "@/pseudo/refusal";
import { pseudoTarget } from "@/pseudo/target";

/** The `pseudoKinds` name relay lists while it serves `POST /pseudo-access`. */
export const ACCESS_KIND = "access";

/** The form field a part of the `POST /pseudo-access` body comes from; `access` is the access step as a whole. */
export type AccessRefusalField =
	| "everyCredential"
	| "accountIds"
	| "poolIds"
	| "access";

/** `/spec/target` (a policy set above, links a copy can't carry) belongs to no field. */
export const ACCESS_POINTER_FIELDS: PointerFields<AccessRefusalField> = {
	"/spec/access/everyCredential": "everyCredential",
	"/spec/access/accountIds": "accountIds",
	"/spec/access/poolIds": "poolIds",
	"/spec/access": "access",
};

export const BINDING_OFF_LINE =
	"Its binding is turned off, so this policy doesn't apply to it now.";

/** Said beside the current policy line when the binding that holds the target is disabled. */
export function bindingOffLine(
	current: Pick<PolicyCurrent, "bindingEnabled"> | undefined,
): string | undefined {
	return current?.bindingEnabled === false ? BINDING_OFF_LINE : undefined;
}

export type AccessRefusal = Refusal<AccessRefusalField>;

/** The whole access as the form states it. */
export interface PseudoAccessAnswers {
	everyCredential: boolean;
	/** Linked first, in this order. */
	poolIds: readonly string[];
	accountIds: readonly string[];
	models: readonly string[];
}

/**
 * The pools the save links: the current policy's pools still chosen, in its
 * order, then newly picked ones in pick order. None for every credential.
 */
export function sentPoolIds(
	everyCredential: boolean,
	currentPoolIds: readonly string[],
	chosen: readonly string[],
): string[] {
	if (everyCredential) return [];
	return [
		...currentPoolIds.filter((id) => chosen.includes(id)),
		...chosen.filter((id) => !currentPoolIds.includes(id)),
	];
}

/** The `POST /pseudo-access` body; empty lists are left out, as relay reads them the same. */
export function pseudoAccessBody(
	target: Pick<AccessTarget, "kind" | "id">,
	answers: PseudoAccessAnswers,
): PseudoAccess {
	const models =
		answers.models.length > 0 ? { models: [...answers.models] } : {};
	const access = answers.everyCredential
		? { everyCredential: true, ...models }
		: {
				everyCredential: false,
				...(answers.poolIds.length > 0
					? { poolIds: [...answers.poolIds] }
					: {}),
				...(answers.accountIds.length > 0
					? { accountIds: [...answers.accountIds] }
					: {}),
				...models,
			};
	return { spec: { target: pseudoTarget(target), access } };
}

/** Whether the dry run says Save would write nothing. */
export function writesNothing(
	answer: Pick<
		PseudoAccessAnswer,
		"unchanged" | "created" | "updated" | "deleted"
	>,
): boolean {
	return (
		answer.unchanged === true ||
		[answer.created, answer.updated, answer.deleted].every(
			(rows) => (rows ?? []).length === 0,
		)
	);
}

/** One line on what the target is under now and what a save does to it. */
export function pseudoCurrentLine(
	accessCase: AccessCase,
	policyName: string | undefined,
	target: string,
): string {
	if (accessCase === "none" || !policyName) return "No policy yet";
	if (accessCase === "own") return `Policy ${policyName}`;
	return `Policy ${policyName}, shared or set elsewhere: saving makes a copy for ${target}`;
}

function caseLine(accessCase: AccessCase, target: string): string {
	switch (accessCase) {
		case "none":
			return "Made a policy.";
		case "own":
			return "Changed its policy.";
		case "copy":
			return `Made a copy of the shared policy for ${target}.`;
	}
}

/** Why the pre-fill dry run was refused: a policy set above the caller, or anything else with its message. */
export function prefillRefusal(err: unknown): {
	above: boolean;
	message: string;
} {
	const above = isPolicySetAbove(err);
	const refusal = parseRefusal(err, ACCESS_POINTER_FIELDS);
	const message =
		refusal.kind === "issues"
			? refusal.issues.map((i) => i.message).join(" ")
			: refusal.message;
	return { above, message };
}

/** The done screen's data from relay's 201 answer. */
export function savedAccess(
	answer: Pick<PseudoAccessAnswer, "case" | "policy" | "hiddenPoolsKept">,
	target: string,
): SavedAccess {
	return {
		policyName: required(answer.policy?.name, "policy"),
		caseLine: caseLine(answer.case, target),
		...(answer.hiddenPoolsKept
			? { hiddenPoolsKept: answer.hiddenPoolsKept }
			: {}),
	};
}
