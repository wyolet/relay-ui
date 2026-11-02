import { useMemo, useState } from "react";
import type { CatalogRef } from "@/lib/catalogRef";
import {
	parseValidRefs,
	toggleHostRef,
	toggleModelRef,
	toggleProviderRef,
} from "@/lib/catalogRefToggle";
import type { HostRow, ModelRow, ProviderRow } from "@/models/usePickerCatalog";

/**
 * The picker's ref selection. Empty `value` is the backend's "allow all"
 * sentinel; `forceRestrict` keeps the picker open while the operator narrows
 * access but hasn't picked anything yet. A `restrictTo` parent grant always
 * restricts, so the toggle is hidden.
 */
export function usePickerSelection({
	value,
	onChange,
	restrictTo,
}: {
	value: string[];
	onChange: (next: string[]) => void;
	restrictTo?: readonly string[];
}) {
	const [forceRestrict, setForceRestrict] = useState(false);
	const hasParentRestriction = restrictTo !== undefined;
	const restricted = hasParentRestriction || value.length > 0 || forceRestrict;

	const refs = useMemo(() => parseValidRefs(value), [value]);

	function setRestricted(next: boolean) {
		setForceRestrict(next);
		if (!next) onChange([]);
	}

	// Round-trip refs verbatim — new refs carry their canonical `raw`, existing
	// ones keep whatever the operator typed.
	function setRefs(next: CatalogRef[]) {
		onChange(next.map((r) => r.raw));
	}

	return {
		hasParentRestriction,
		restricted,
		setRestricted,
		refs,
		removeRaw: (raw: string) => onChange(value.filter((r) => r !== raw)),
		toggleProvider: (p: ProviderRow) =>
			setRefs(toggleProviderRef(refs, p.name)),
		toggleModel: (m: ModelRow) => {
			const next = toggleModelRef(refs, m.provider, m.name);
			if (next) setRefs(next);
		},
		toggleHost: (h: HostRow) => setRefs(toggleHostRef(refs, h.name)),
	};
}
