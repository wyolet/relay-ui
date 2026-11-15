import type { Model, ModelCapabilities } from "@/api/types/model";
import { fmtTokens } from "@/lib/format";
import { modelProductLine } from "@/models/groupModelsByFamily";

/** A model's deprecation as a sentence: status, sunset, successor. */
export function deprecationNote(m: Model): string | null {
	const d = m.spec.deprecation;
	const date = m.spec.deprecationDate;
	if (!d && !date) return null;
	const status = d?.status ?? "deprecated";
	let note = status.charAt(0).toUpperCase() + status.slice(1);
	if (d?.sunsetDate) note += `, sunsets on ${d.sunsetDate}`;
	else if (date) note += ` since ${date}`;
	note += ".";
	if (d?.replacement) note += ` Replaced by ${d.replacement}.`;
	return note;
}

export function activeCapabilities(
	cap: ModelCapabilities | undefined,
): string[] {
	if (!cap) return [];
	return Object.entries(cap)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
}

/** "claude 4.5" — the family with its version, when there is a family. */
export function familyLabel(m: Model): string | undefined {
	if (!m.spec.family) return undefined;
	return `${m.spec.family}${m.spec.version ? ` ${m.spec.version}` : ""}`;
}

/** Newest release first; undated snapshots last, by name. */
export function sortSnapshots<T extends { name: string; releasedAt?: string }>(
	snapshots: readonly T[],
): T[] {
	return [...snapshots].sort((a, b) => {
		const ad = a.releasedAt ?? "";
		const bd = b.releasedAt ?? "";
		if (ad && bd) return bd.localeCompare(ad);
		if (ad) return -1;
		if (bd) return 1;
		return a.name.localeCompare(b.name);
	});
}

export interface SpecField {
	label: string;
	value: string;
}

/** The spec facts the catalog filled in, in reading order; a field without a
 * value is left out rather than shown empty. */
export function specFields(m: Model): SpecField[] {
	const s = m.spec;
	const tokens = (n: number | undefined) =>
		n ? `${fmtTokens(n)} tokens` : undefined;
	const list = (items: readonly string[] | null | undefined) =>
		items?.length ? items.join(", ") : undefined;
	const productLine = modelProductLine(m);
	const fields: [string, string | undefined][] = [
		productLine ? ["Line", productLine] : ["Family", familyLabel(m)],
		["Context", tokens(s.contextWindowTotal)],
		["Input limit", tokens(s.contextWindowInput)],
		["Max output", tokens(s.maxOutputTokens ?? s.contextWindowOutput)],
		["Accepts", list(s.modalities?.input)],
		["Produces", list(s.modalities?.output)],
		["Knowledge cutoff", s.knowledgeCutoff],
		["Released", s.releaseDate],
		["License", s.license],
		["Points to", s.pointer !== m.metadata.name ? s.pointer : undefined],
		["Aliases", list(s.aliases)],
		["Tags", list(s.tags)],
	];
	return fields.flatMap(([label, value]) =>
		value?.trim() ? [{ label, value }] : [],
	);
}

/** Snapshots are worth listing when there is more than the one the model
 * already points to. */
export function listedSnapshots(
	m: Model,
): NonNullable<Model["spec"]["snapshots"]> {
	const snapshots = m.spec.snapshots ?? [];
	if (snapshots.length === 1 && snapshots[0]?.name === m.spec.pointer)
		return [];
	return snapshots;
}
