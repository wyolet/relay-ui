import { useQuery } from "@tanstack/react-query";
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
