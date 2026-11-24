import type {
	PseudoLimits,
	PseudoLimitsAnswer,
} from "@/api/hooks/pseudoLimits";
import type { components } from "@/api/types.gen";
import { required } from "@/lib/required";
import type { LimitLink, LimitSpec, LimitTarget } from "@/limits/limitWrites";
import type { AddedLimit } from "@/limits/useLimitWrites";
import { pseudoTarget } from "@/pseudo/target";

type LimitsSpec = components["schemas"]["LimitsSpec"];

/**
 * Whether relay's body takes the link options. Once the generated spec gains
 * `link` this stops compiling: set it true and fill `link` in the body.
 */
export const BODY_HAS_LINK: "link" extends keyof LimitsSpec ? true : false =
	false;

/** Whether one request says it all: always once the body has the link, else only for its defaults (shared, every model). */
export function postsOnce(link: LimitLink, bodyHasLink: boolean): boolean {
	return bodyHasLink || (link.shared && link.models.length === 0);
}

/** The `POST /pseudo-limits` body; relay names the limit after `displayName` and links it with the defaults. */
export function pseudoLimitsBody(
	target: Pick<LimitTarget, "kind" | "id">,
	displayName: string,
	limit: LimitSpec,
): PseudoLimits {
	return {
		metadata: { displayName },
		spec: {
			target: pseudoTarget(target),
			...(limit.kind === "budget"
				? { budget: limit.spec }
				: { rateLimit: limit.spec }),
		},
	};
}

/** The done screen's data from relay's answer. */
export function addedFromAnswer(
	answer: PseudoLimitsAnswer,
	target: LimitTarget,
): AddedLimit {
	return {
		kind: answer.budget ? "budget" : "rateLimit",
		limitName: required(answer.budget ?? answer.rateLimit, "limit").name,
		policyName: required(answer.policy, "policy").name,
		policyCase: answer.case,
		target,
	};
}
