import {
	type CatalogRef,
	formatCatalogRef,
	parseCatalogRef,
} from "@/lib/catalogRef";

/** Parse ref strings, dropping the ones that don't parse. */
export function parseValidRefs(values: readonly string[]): CatalogRef[] {
	return values
		.map((r) => {
			try {
				return parseCatalogRef(r);
			} catch {
				return null;
			}
		})
		.filter((r): r is CatalogRef => r !== null);
}

/** Add or drop a provider grant; adding drops the finer refs it subsumes. */
export function toggleProviderRef(
	refs: CatalogRef[],
	provider: string,
): CatalogRef[] {
	const existing = refs.find(
		(r) => r.kind === "provider" && r.provider === provider,
	);
	if (existing) return refs.filter((r) => r.raw !== existing.raw);
	return [
		...refs.filter((r) => r.provider !== provider),
		parseCatalogRef(formatCatalogRef({ provider })),
	];
}

/** Add or drop a model grant; adding drops its binding-level refs. Null when
 * a provider grant already covers the model — that one has to go first. */
export function toggleModelRef(
	refs: CatalogRef[],
	provider: string,
	model: string,
): CatalogRef[] | null {
	if (refs.some((r) => r.kind === "provider" && r.provider === provider)) {
		return null;
	}
	const existing = refs.find(
		(r) => r.kind === "model" && r.provider === provider && r.model === model,
	);
	if (existing) return refs.filter((r) => r.raw !== existing.raw);
	return [
		...refs.filter(
			(r) =>
				!(r.kind === "binding" && r.provider === provider && r.model === model),
		),
		parseCatalogRef(formatCatalogRef({ provider, model })),
	];
}
