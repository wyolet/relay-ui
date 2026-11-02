import { useMemo, useState } from "react";
import { filterByText } from "@/lib/filterByText";
import type { PickerIndex } from "@/models/usePickerCatalog";

/** The picker's search box and the provider / model rows it matches. */
export function usePickerSearch(index: PickerIndex) {
	const [q, setQ] = useState("");
	const { providers, modelRows } = index;

	const filteredProviders = useMemo(
		() => filterByText(providers, q, (p) => [p.name, p.displayName]),
		[providers, q],
	);
	const filteredModels = useMemo(
		() =>
			filterByText(modelRows, q, (m) => [m.name, m.displayName, m.provider]),
		[modelRows, q],
	);

	return {
		q,
		setQ,
		providers: filteredProviders,
		models: filteredModels,
	};
}
