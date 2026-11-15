import { useNavigate, useSearch } from "@tanstack/react-router";
import type { QuickFilter } from "@/filters/FilterBar";
import { ORIGIN_OPTIONS, type Origin } from "@/lib/ownerFilter";

/** The Policies page's Custom / Provider quick filter, kept in the URL so it
 * holds across the policies and rate-limits tabs. */
export function useOriginFilter(): QuickFilter<Origin> {
	const { origin } = useSearch({ from: "/_authenticated/policies/" });
	const navigate = useNavigate({ from: "/policies/" });
	return {
		label: "Origin",
		options: ORIGIN_OPTIONS,
		selected: origin,
		onChange: (next) =>
			void navigate({
				search: (prev) => ({ ...prev, origin: next }),
				replace: true,
			}),
	};
}
