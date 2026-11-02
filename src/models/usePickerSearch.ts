import { useMemo, useState } from "react";
import { filterByText } from "@/lib/filterByText";
import type { PickerIndex } from "@/models/usePickerCatalog";

/** The picker's search box and the provider / model / host rows it matches. */
export function usePickerSearch(
	index: PickerIndex,
	includeDeprecated: boolean,
) {
	const [q, setQ] = useState("");
	const { providers, hosts, modelRows } = index;

	const filteredProviders = useMemo(
		() => filterByText(providers, q, (p) => [p.name, p.displayName]),
		[providers, q],
	);
	const visibleModels = useMemo(
		() =>
			includeDeprecated ? modelRows : modelRows.filter((m) => !m.deprecated),
		[modelRows, includeDeprecated],
	);
	const filteredModels = useMemo(
		() =>
			filterByText(visibleModels, q, (m) => [
				m.name,
				m.displayName,
				m.provider,
			]),
		[visibleModels, q],
	);
	const filteredHosts = useMemo(
		() => filterByText(hosts, q, (h) => [h.name, h.displayName]),
		[hosts, q],
	);

	return {
		q,
		setQ,
		providers: filteredProviders,
		models: filteredModels,
		hosts: filteredHosts,
	};
}
