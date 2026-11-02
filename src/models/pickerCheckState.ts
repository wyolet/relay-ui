import { type CatalogRef, refCovers } from "@/lib/catalogRef";
import type { HostRow, ModelRow, PickerIndex } from "@/models/usePickerCatalog";

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

/** A host row's check: on for an `@host` grant, else by how many of its
 * bindings the refs cover. */
export function hostCheck(
	refs: CatalogRef[],
	h: HostRow,
	index: PickerIndex,
): { state: CheckState; covered: number; total: number } {
	const name = h.name;
	const bindings = index.bindingsByHostName.get(name) ?? [];
	const total = bindings.length;
	const covered = bindings.filter((b) =>
		refs.some((r) =>
			refCovers(r, { provider: b.provider, model: b.model, host: name }),
		),
	).length;
	const hostGranted = refs.some((r) => r.kind === "host" && r.host === name);
	const state: CheckState = hostGranted
		? "on"
		: total === 0
			? "off"
			: covered === total
				? "on"
				: covered > 0
					? "indeterminate"
					: "off";
	return { state, covered, total };
}
