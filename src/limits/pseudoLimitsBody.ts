import type {
	PseudoLimits,
	PseudoLimitsAnswer,
} from "@/api/hooks/pseudoLimits";
import type { components } from "@/api/types.gen";
import { required } from "@/lib/required";
import type {
	LimitKind,
	LimitLink,
	LimitSpec,
	LimitTarget,
} from "@/limits/limitWrites";
import type { AddedLimit } from "@/limits/useLimitWrites";
import { pseudoTarget } from "@/pseudo/target";

type LinkBody = components["schemas"]["LimitLink"];
type StoredLink = components["schemas"]["PseudoLimitLink"];

/** The link options that differ from relay's defaults (shared, every model); undefined when none do. A budget never sends models. */
export function pseudoLimitLink(
	kind: LimitKind,
	link: LimitLink,
): LinkBody | undefined {
	const body: LinkBody = {
		...(link.shared ? {} : { shared: false }),
		...(kind === "rateLimit" && link.models.length > 0
			? { models: [...link.models] }
			: {}),
	};
	return Object.keys(body).length > 0 ? body : undefined;
}

/** The `POST /pseudo-limits` body. `name` is always sent: relay answers 409 when a name it derives is taken. */
export function pseudoLimitsBody(
	target: Pick<LimitTarget, "kind" | "id">,
	metadata: { name: string; displayName: string },
	limit: LimitSpec,
	link: LimitLink,
): PseudoLimits {
	const linkBody = pseudoLimitLink(limit.kind, link);
	return {
		metadata,
		spec: {
			target: pseudoTarget(target),
			...(limit.kind === "budget"
				? { budget: limit.spec }
				: { rateLimit: limit.spec }),
			...(linkBody ? { link: linkBody } : {}),
		},
	};
}

/** The link as relay stored it. */
export function storedLink(link: StoredLink): LimitLink {
	return { shared: link.shared, models: link.models ?? [] };
}

/** The done screen's data from relay's answer. */
export function addedFromAnswer(
	answer: PseudoLimitsAnswer,
	target: LimitTarget,
): AddedLimit {
	const limit = required(answer.budget ?? answer.rateLimit, "limit");
	return {
		kind: answer.budget ? "budget" : "rateLimit",
		limitName: limit.name,
		link: storedLink(limit.link),
		policyName: required(answer.policy, "policy").name,
		policyCase: answer.case,
		target,
	};
}
