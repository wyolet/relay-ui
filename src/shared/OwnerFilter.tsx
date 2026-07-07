import { FilterDropdown } from "@/shared/FilterDropdown";

/** User- vs host-owned resource filter, shared by the policies and
 * rate-limits index tables. */
export type OwnerFilter = "user" | "host" | "all";

export const OWNER_FILTER_OPTIONS: { value: OwnerFilter; label: string }[] = [
	{ value: "user", label: "User" },
	{ value: "host", label: "Host" },
	{ value: "all", label: "All" },
];

export function matchesOwnerFilter(
	owner: { kind?: string } | undefined,
	filter: OwnerFilter,
): boolean {
	if (filter === "all") return true;
	const kind = owner?.kind ?? "user";
	return kind === filter;
}

export function OwnerFilterSelect({
	value,
	onChange,
}: {
	value: OwnerFilter;
	onChange: (v: OwnerFilter) => void;
}) {
	return (
		<FilterDropdown
			label="Owner"
			value={value}
			options={OWNER_FILTER_OPTIONS}
			onChange={onChange}
		/>
	);
}
