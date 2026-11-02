import { useMemo } from "react";
import type { CatalogRef } from "@/lib/catalogRef";
import {
	parseValidRefs,
	toggleModelRef,
	toggleProviderRef,
} from "@/lib/catalogRefToggle";
import type { ModelRow, ProviderRow } from "@/models/usePickerCatalog";

/** The picker's ref selection, toggled by provider or by model. */
export function usePickerSelection({
	value,
	onChange,
}: {
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const refs = useMemo(() => parseValidRefs(value), [value]);

	// Round-trip refs verbatim — new refs carry their canonical `raw`, existing
	// ones keep whatever the operator typed.
	function setRefs(next: CatalogRef[]) {
		onChange(next.map((r) => r.raw));
	}

	return {
		refs,
		removeRaw: (raw: string) => onChange(value.filter((r) => r !== raw)),
		toggleProvider: (p: ProviderRow) =>
			setRefs(toggleProviderRef(refs, p.name)),
		toggleModel: (m: ModelRow) => {
			const next = toggleModelRef(refs, m.provider, m.name);
			if (next) setRefs(next);
		},
	};
}
