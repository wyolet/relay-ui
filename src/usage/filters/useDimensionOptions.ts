import { useQuery } from "@tanstack/react-query";
import {
	type UsageSummaryFilter,
	type UsageWindow,
	usageFacetsQueryOptions,
	usageSummaryQueryOptions,
} from "@/api/hooks/usage";
import type { FilterOption } from "@/filters/types";
import { fmtCompact } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import { FILTER_DIMENSIONS, type FilterDimension } from "./dimensions";

/**
 * Filter choices for one dimension: the values that saw traffic in the
 * window, busiest first, with their request counts. Every picker shares one
 * facets call; relays without it fall back to a summary per dimension.
 */
export function useDimensionOptions(
	d: FilterDimension,
	win: UsageWindow,
	filter: UsageSummaryFilter,
): { options: FilterOption[]; loading: boolean } {
	const facets = useQuery(
		usageFacetsQueryOptions(FILTER_DIMENSIONS, win, filter),
	);
	const { [d]: _own, ...others } = filter;
	const fallback = useQuery({
		...usageSummaryQueryOptions(d, win, others),
		enabled: facets.isError,
	});
	const labelFor = useGroupLabeler(d);

	const values = facets.data
		? (facets.data[d] ?? []).map((f) => ({
				value: f.value,
				label: f.label,
				requests: f.requests,
			}))
		: (fallback.data?.rows ?? [])
				.map((r) => ({
					value: r.group?.[d]?.trim() ?? "",
					label: undefined,
					requests: r.requests,
				}))
				.sort((a, b) => b.requests - a.requests);

	return {
		// Unattributed traffic ("") can't be filtered on.
		options: values
			.filter((v) => v.value !== "")
			.map((v) => ({
				value: v.value,
				label: `${v.label || labelFor(v.value)} · ${fmtCompact(v.requests)}`,
			})),
		loading: facets.isPending || (facets.isError && fallback.isPending),
	};
}
