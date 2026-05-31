import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import type { FilterOption } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import type { LogDimensionKey } from "./logFilterConfig";

interface Listed {
	metadata: { id?: string; name: string; displayName?: string };
}

function toOptions(
	items: readonly Listed[] | null | undefined,
): FilterOption[] {
	return (items ?? [])
		.filter((r): r is Listed & { metadata: { id: string } } =>
			Boolean(r.metadata.id),
		)
		.map((r) => ({ value: r.metadata.id, label: displayLabel(r.metadata) }));
}

/**
 * Selectable options for each log dimension multi-select, sourced from the
 * catalog lists. Values are the resource ids the /logs filter matches on;
 * labels are the human display names.
 */
export function useLogsFilterOptions(): Record<
	LogDimensionKey,
	FilterOption[]
> {
	const models = useQuery(modelsListQueryOptions);
	const hosts = useQuery(hostsListQueryOptions);
	const policies = useQuery(policiesListQueryOptions);

	return {
		model_id: toOptions(models.data?.items),
		host_id: toOptions(hosts.data?.items),
		policy_id: toOptions(policies.data?.items),
	};
}

export type LogLabelKind = "model" | "host" | "policy";

/** A resolver from a log's resource id (uuid) to its catalog display name. */
export type LogLabeler = (
	kind: LogLabelKind,
	id: string | undefined,
) => string | undefined;

function indexById(
	items: readonly Listed[] | null | undefined,
): Map<string, string> {
	const m = new Map<string, string>();
	for (const r of items ?? []) {
		if (r.metadata.id) m.set(r.metadata.id, displayLabel(r.metadata));
	}
	return m;
}

/**
 * Resolve model/host/policy ids logged on each event to their display names,
 * from the cached catalog lists. Returns the id unchanged when unresolvable
 * (e.g. the resource was deleted), and undefined for a missing id.
 */
export function useLogLabeler(): LogLabeler {
	const models = useQuery(modelsListQueryOptions);
	const hosts = useQuery(hostsListQueryOptions);
	const policies = useQuery(policiesListQueryOptions);

	const maps = useMemo(
		() => ({
			model: indexById(models.data?.items),
			host: indexById(hosts.data?.items),
			policy: indexById(policies.data?.items),
		}),
		[models.data, hosts.data, policies.data],
	);

	return (kind, id) => (id ? (maps[kind].get(id) ?? id) : undefined);
}
