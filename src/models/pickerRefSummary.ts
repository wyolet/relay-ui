import type { CatalogRef } from "@/lib/catalogRef";
import type { PickerIndex } from "@/models/usePickerCatalog";

interface RefCounts {
	providers?: number;
	models?: number;
	hosts?: number;
}

/** "3 models · 2 hosts" — what a granted ref reaches in the catalog. */
export function refReachText(
	ref: CatalogRef,
	index: PickerIndex,
): string | undefined {
	return formatCounts(countsForRef(ref, index));
}

function countsForRef(ref: CatalogRef, index: PickerIndex): RefCounts {
	const host = ref.host;

	if (ref.kind === "host" && host) {
		const rows = index.modelRows.filter((m) => m.hostNames.includes(host));
		const providers = new Set(rows.map((m) => m.provider));
		return { providers: providers.size, models: rows.length };
	}
	if (!ref.provider) return {};
	const providerRows = index.modelsByProvider.get(ref.provider) ?? [];

	if (ref.kind === "provider") {
		const hosts = new Set<string>();
		for (const m of providerRows) for (const h of m.hostNames) hosts.add(h);
		return { models: providerRows.length, hosts: hosts.size };
	}
	if (ref.kind === "provider-on-host" && host) {
		const rows = providerRows.filter((m) => m.hostNames.includes(host));
		return { models: rows.length };
	}
	if (ref.kind === "model" && ref.model) {
		const row = providerRows.find((m) => m.name === ref.model);
		if (!row) return {};
		return { hosts: row.hostNames.length };
	}
	return {};
}

function formatCounts(c: RefCounts): string | undefined {
	const parts: string[] = [];
	if (c.providers !== undefined) {
		parts.push(`${c.providers} provider${c.providers === 1 ? "" : "s"}`);
	}
	if (c.models !== undefined) {
		parts.push(`${c.models} model${c.models === 1 ? "" : "s"}`);
	}
	if (c.hosts !== undefined) {
		parts.push(`${c.hosts} host${c.hosts === 1 ? "" : "s"}`);
	}
	return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** A granted ref in words, with catalog display names. */
export function describeRef(ref: CatalogRef, index: PickerIndex): string {
	const providerLabel = ref.provider
		? (index.providersByName.get(ref.provider)?.displayName ?? ref.provider)
		: undefined;
	const hostLabel = ref.host
		? (index.hostsByName.get(ref.host)?.displayName ?? ref.host)
		: undefined;
	const modelLabel = (() => {
		if (!ref.model || !ref.provider) return undefined;
		const row = (index.modelsByProvider.get(ref.provider) ?? []).find(
			(m) => m.name === ref.model,
		);
		return row?.displayName ?? ref.model;
	})();

	switch (ref.kind) {
		case "provider":
			return `All ${providerLabel} models`;
		case "provider-on-host":
			return `All ${providerLabel} models on ${hostLabel}`;
		case "model":
			return modelLabel ?? ref.raw;
		case "binding":
			return `${modelLabel} on ${hostLabel}`;
		case "host":
			return `Every model served by ${hostLabel}`;
	}
}
