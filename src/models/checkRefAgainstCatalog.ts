import { parseCatalogRef, validateCatalogRef } from "@/lib/catalogRef";
import { editDistance } from "@/lib/editDistance";
import { from as slugFrom } from "@/lib/slug";
import type { PickerIndex } from "@/models/usePickerCatalog";

/**
 * Why a typed ref can't be granted against this catalog, or undefined when it
 * can: bad characters (with a slugged or nearest suggestion), bad syntax, or
 * a provider / model / host the catalog doesn't have.
 */
export function checkRefAgainstCatalog(
	ref: string,
	index: PickerIndex,
): string | undefined {
	const bad = ref.match(/[.:]/);
	if (bad) {
		const slugged = slugifyRef(ref);
		if (
			slugged !== ref &&
			checkRefAgainstCatalog(slugged, index) === undefined
		) {
			return `"${bad[0]}" isn't allowed in refs — did you mean "${slugged}"?`;
		}
		const near = closestRef(slugged || ref, index);
		if (near) {
			return `"${bad[0]}" isn't allowed in refs — closest match is "${near}".`;
		}
		return `"${bad[0]}" isn't allowed — refs use DNS-style slugs. Replace "." and ":" with "-".`;
	}
	const synErr = validateCatalogRef(ref);
	if (synErr) return synErr;
	const parsed = parseCatalogRef(ref);
	const host = parsed.host;

	if (parsed.kind === "host") {
		if (!host || !index.hostsByName.has(host)) {
			return `Host "${host}" doesn't exist`;
		}
		return undefined;
	}

	if (!parsed.provider || !index.providersByName.has(parsed.provider)) {
		return `Provider "${parsed.provider}" doesn't exist`;
	}

	const providerModels = index.modelsByProvider.get(parsed.provider) ?? [];

	if (parsed.model !== undefined) {
		const model = providerModels.find((m) => m.name === parsed.model);
		if (!model) {
			const near = closestRef(`${parsed.provider}/${parsed.model}`, index);
			const hint = near ? ` — did you mean "${near}"?` : "";
			return `Model "${parsed.provider}/${parsed.model}" doesn't exist${hint}`;
		}
		if (host !== undefined) {
			if (!index.hostsByName.has(host)) {
				return `Host "${host}" doesn't exist`;
			}
			if (!model.hostNames.includes(host)) {
				return `Model "${parsed.provider}/${parsed.model}" isn't served on host "${host}"`;
			}
		}
		return undefined;
	}

	if (host !== undefined) {
		if (!index.hostsByName.has(host)) {
			return `Host "${host}" doesn't exist`;
		}
		const hasBinding = providerModels.some((m) => m.hostNames.includes(host));
		if (!hasBinding) {
			return `No "${parsed.provider}" models on host "${host}"`;
		}
	}
	return undefined;
}

function slugifyRef(ref: string): string {
	return ref
		.split(/([/@])/)
		.map((part, i) => (i % 2 === 0 ? slugFrom(part) : part))
		.join("");
}

function allRefs(index: PickerIndex): string[] {
	const out: string[] = [];
	for (const p of index.providersByName.keys()) out.push(p);
	for (const [prov, rows] of index.modelsByProvider) {
		for (const r of rows) out.push(`${prov}/${r.name}`);
	}
	for (const h of index.hostsByName.keys()) out.push(`@${h}`);
	return out;
}

function closestRef(ref: string, index: PickerIndex): string | undefined {
	let best: string | undefined;
	let bestDist = Number.POSITIVE_INFINITY;
	for (const c of allRefs(index)) {
		const d = editDistance(ref, c);
		if (d < bestDist) {
			best = c;
			bestDist = d;
		}
	}
	if (best === undefined) return undefined;
	const threshold = Math.max(2, Math.floor(ref.length * 0.34));
	return bestDist <= threshold ? best : undefined;
}
