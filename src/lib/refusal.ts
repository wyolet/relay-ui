import type { components } from "@/api/types.gen";

/** Why relay refused a request itself; absent when the upstream errored. */
export type Refusal = NonNullable<components["schemas"]["Event"]["refusal"]>;

const REFUSAL_TEXT: Record<Refusal, { label: string; reason: string }> = {
	model_not_allowed: {
		label: "Model not allowed",
		reason:
			"A policy refused the model, or the account is closed or not held by the caller.",
	},
	host_not_reachable: {
		label: "Host not reachable",
		reason: "No binding or pool reaches a host that serves the model.",
	},
	no_capacity: {
		label: "No capacity",
		reason:
			"A rate limit, budget or cooldown held the request, or every host key was out of rotation.",
	},
};

export function isRefusal(value: string): value is Refusal {
	return Object.hasOwn(REFUSAL_TEXT, value);
}

export const REFUSALS: readonly Refusal[] =
	Object.keys(REFUSAL_TEXT).filter(isRefusal);

/** The refusal's name; an unknown value comes back as is. */
export function refusalLabel(value: string): string {
	return isRefusal(value) ? REFUSAL_TEXT[value].label : value;
}

export function refusalReason(refusal: Refusal): string {
	return REFUSAL_TEXT[refusal].reason;
}

export interface RefusalCount {
	refusal: Refusal;
	requests: number;
}

/** Non-zero counts per refusal from summary rows grouped by refusal; the
 * ungrouped row (requests relay didn't refuse) drops out. */
export function refusalCounts(
	rows: readonly { group?: Record<string, string>; requests: number }[],
): RefusalCount[] {
	return REFUSALS.flatMap((refusal) => {
		const requests = rows
			.filter((r) => r.group?.refusal === refusal)
			.reduce((n, r) => n + r.requests, 0);
		return requests > 0 ? [{ refusal, requests }] : [];
	});
}
