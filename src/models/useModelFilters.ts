import { useQuery } from "@tanstack/react-query";
import { modelsListQueryOptions } from "@/api/hooks/models";
import type { FilterDef } from "@/filters/types";
import { distinctProductLines } from "@/models/groupModelsByFamily";

/** Keys match the models route's search schema. */
const STATIC_MODEL_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search models",
		default: "",
	},
	{
		key: "deprecated",
		type: "select",
		label: "Status",
		default: "active",
		options: [
			{ value: "active", label: "Active only" },
			{ value: "deprecated", label: "Deprecated only" },
			{ value: "all", label: "All" },
		],
	},
] as const satisfies readonly FilterDef[];

/**
 * Filters above the Models table. The line select draws its options from the
 * full catalog without suspending, so it appears once that list loads and only
 * when some model has a line.
 */
export function useModelFilters(): readonly FilterDef[] {
	const { data } = useQuery(modelsListQueryOptions);
	const lines = distinctProductLines(data?.items ?? []);
	if (lines.length === 0) return STATIC_MODEL_FILTERS;
	return [
		...STATIC_MODEL_FILTERS,
		{
			key: "line",
			type: "select",
			label: "Line",
			default: "",
			options: [
				{ value: "", label: "All lines" },
				...lines.map((line) => ({ value: line, label: line })),
			],
		},
	];
}
