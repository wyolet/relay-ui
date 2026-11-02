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
import {
	FILTER_DIMENSIONS,
	FIXED_DIMENSION_VALUES,
	type FilterDimension,
} from "./dimensions";

interface Counted {
	value: string;
	label: string | undefined;
	/** Undefined for a fixed value no traffic in the slice carried. */
	requests: number | undefined;
}

/**
 * Filter choices for one dimension: the values that saw traffic in the
 * window, busiest first, with their request counts; a closed set lists every
 * value in its own order, counted where traffic carried it. Every picker shares one
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

	const counted: Counted[] = facets.data
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
	const fixed = FIXED_DIMENSION_VALUES[d];
	const values: Counted[] = fixed
		? fixed.map(
				(value) =>
					counted.find((v) => v.value === value) ?? {
						value,
						label: undefined,
						requests: undefined,
					},
			)
		: counted;

	return {
		// Unattributed traffic ("") can't be filtered on.
		options: values
			.filter((v) => v.value !== "")
			.map((v) => {
				const name = v.label || labelFor(v.value);
				return {
					value: v.value,
					label:
						v.requests === undefined
							? name
							: `${name} · ${fmtCompact(v.requests)}`,
				};
			}),
		loading: facets.isPending || (facets.isError && fallback.isPending),
	};
}
