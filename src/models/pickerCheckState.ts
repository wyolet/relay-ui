import { type CatalogRef, refCovers } from "@/lib/catalogRef";
import type { ModelRow } from "@/models/usePickerCatalog";

/** "covered" = granted through a coarser ref, so read-only in this row. */
export type CheckState = "off" | "on" | "indeterminate" | "covered";

export function isProviderSelected(refs: CatalogRef[], provider: string) {
	return refs.some((r) => r.kind === "provider" && r.provider === provider);
}

export function modelCheckState(refs: CatalogRef[], m: ModelRow): CheckState {
	if (isProviderSelected(refs, m.provider)) return "covered";
	const ownRef = refs.find(
		(r) =>
			r.kind === "model" && r.provider === m.provider && r.model === m.name,
	);
	return ownRef ? "on" : "off";
}

/** Whether any ref grants the model on this one host. */
export function isBindingCovered(
	refs: CatalogRef[],
	m: ModelRow,
	host: string,
): boolean {
	return refs.some((r) =>
		refCovers(r, { provider: m.provider, model: m.name, host }),
	);
}
