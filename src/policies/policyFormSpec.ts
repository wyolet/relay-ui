import type { PolicySpec } from "@/api/types/policy";

export interface RateLimitLinkValue {
	rateLimitId: string;
	models: string[];
}

/** The spec fields the policy form edits; the rest (credentialIds) ride
 * along from the loaded policy untouched. */
export interface PolicySpecValues {
	poolIds: string[];
	models: string[];
	rateLimits: RateLimitLinkValue[];
	budgetIds: string[];
	enabled: boolean;
	includeDeprecated: boolean;
	payloadLoggingEnabled: boolean;
}

function listOrNull<T>(items: T[]): T[] | null {
	return items.length > 0 ? items : null;
}

export function specFromFormValues(
	values: PolicySpecValues,
): Omit<PolicySpec, "credentialIds"> {
	return {
		enabled: values.enabled,
		poolIds: listOrNull(values.poolIds),
		models: listOrNull(values.models),
		rateLimits: listOrNull(
			values.rateLimits
				.filter((l) => l.rateLimitId)
				.map((l) => ({
					rateLimitId: l.rateLimitId,
					models: listOrNull(l.models),
				})),
		),
		budgetIds: listOrNull(values.budgetIds),
		includeDeprecated: values.includeDeprecated,
		payloadLoggingEnabled: values.payloadLoggingEnabled,
	};
}

export function specToFormValues(spec: PolicySpec): PolicySpecValues {
	return {
		poolIds: spec.poolIds ?? [],
		models: spec.models ?? [],
		rateLimits: (spec.rateLimits ?? []).map((l) => ({
			rateLimitId: l.rateLimitId,
			models: l.models ?? [],
		})),
		budgetIds: spec.budgetIds ?? [],
		enabled: spec.enabled ?? true,
		includeDeprecated: spec.includeDeprecated ?? false,
		payloadLoggingEnabled: spec.payloadLoggingEnabled ?? false,
	};
}

/** Moves the item at `from` one step up (-1) or down (+1); out-of-range is a no-op. */
export function moveItem<T>(
	items: readonly T[],
	from: number,
	step: -1 | 1,
): T[] {
	const to = from + step;
	const next = [...items];
	const moved = next[from];
	const target = next[to];
	if (moved === undefined || target === undefined) return next;
	next[from] = target;
	next[to] = moved;
	return next;
}
