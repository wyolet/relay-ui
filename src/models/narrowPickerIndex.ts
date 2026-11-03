import type { ModelRow, PickerIndex } from "@/models/usePickerCatalog";

/** One model the picker may offer, keyed `provider/model` in {@link PickerReach}. */
export interface PickerReachModel {
	/** Hosts serving it, in failover order. */
	hostNames: readonly string[];
	note?: string;
}

/** The models a caller's reach serves; the picker lists only these. */
export interface PickerReach {
	models: ReadonlyMap<string, PickerReachModel>;
}

export function pickerReachKey(provider: string, model: string): string {
	return `${provider}/${model}`;
}

/** The index trimmed to the reach's models, each with the reach's hosts and note. */
export function narrowPickerIndex(
	index: PickerIndex,
	reach: PickerReach,
): PickerIndex {
	const modelRows: ModelRow[] = [];
	const modelsByProvider = new Map<string, ModelRow[]>();
	const usedHosts = new Set<string>();
	for (const m of index.modelRows) {
		const reached = reach.models.get(pickerReachKey(m.provider, m.name));
		if (!reached) continue;
		const hostNames = reached.hostNames.filter((h) => index.hostsByName.has(h));
		for (const h of hostNames) usedHosts.add(h);
		const row: ModelRow = { ...m, hostNames, note: reached.note };
		modelRows.push(row);
		modelsByProvider.set(m.provider, [
			...(modelsByProvider.get(m.provider) ?? []),
			row,
		]);
	}
	const providers = index.providers.filter((p) => modelsByProvider.has(p.name));
	const hosts = index.hosts.filter((h) => usedHosts.has(h.name));
	return {
		providers,
		hosts,
		hostsByName: new Map(hosts.map((h) => [h.name, h])),
		providersByName: new Map(providers.map((p) => [p.name, p])),
		modelRows,
		modelsByProvider,
	};
}
