import { useQuery } from "@tanstack/react-query";
import {
	type UsageSummaryFilter,
	type UsageWindow,
	usageSummaryQueryOptions,
} from "@/api/hooks/usage";
import type { FilterOption } from "@/filters/types";
import { fmtCompact } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";
import type { FilterDimension } from "./search";

/** Filter choices for one dimension: the values that saw traffic in the
 * window, busiest first, with their request counts. The dimension's own
 * filter is left out so more values can be added. */
export function useDimensionOptions(
	d: FilterDimension,
	win: UsageWindow,
	filter: UsageSummaryFilter,
): { options: FilterOption[]; loading: boolean } {
	const { [d]: _own, ...others } = filter;
	const { data, isPending } = useQuery(
		usageSummaryQueryOptions(d, win, others),
	);
	const labelFor = useGroupLabeler(d);
	const options = (data?.rows ?? [])
		.flatMap((r) => {
			const value = r.group?.[d]?.trim();
			return value ? [{ value, requests: r.requests }] : [];
		})
		.sort((a, b) => b.requests - a.requests)
		.map((o) => ({
			value: o.value,
			label: `${labelFor(o.value)} · ${fmtCompact(o.requests)}`,
		}));
	return { options, loading: isPending };
}
