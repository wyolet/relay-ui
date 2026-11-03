import type {
	DraftReachRequest,
	Reachable,
	ReachedModel,
	ReachRef,
	ReachVia,
} from "@/api/hooks/reachable";
import type { CatalogRef } from "@/lib/catalogRef";
import { parseValidRefs } from "@/lib/catalogRefToggle";
import {
	type PickerReach,
	type PickerReachModel,
	pickerReachKey,
} from "@/models/narrowPickerIndex";

/** Where a policy's requests get host keys: its scope's own, or only linked pools. */
export type ReachChoice = "scope" | "pools";

/** A saved policy's reach: linked pools mean pools, none means its scope. */
export function reachChoiceFor(
	poolIds: readonly string[] | null | undefined,
): ReachChoice {
	return poolIds && poolIds.length > 0 ? "pools" : "scope";
}

/**
 * The pools a reach switch leaves linked, and the ones it sets aside: scope
 * drops the pools but keeps them, so switching back restores them.
 */
export function poolIdsOnReachSwitch(
	next: ReachChoice,
	poolIds: readonly string[],
	setAside: readonly string[],
): { poolIds: string[]; setAside: string[] } {
	if (next === "scope") {
		return {
			poolIds: [],
			setAside: poolIds.length > 0 ? [...poolIds] : [...setAside],
		};
	}
	return {
		poolIds: poolIds.length > 0 ? [...poolIds] : [...setAside],
		setAside: [...setAside],
	};
}

/** The draft-reach read for `owner` (a `kind:id` scope); none until the reach names something. */
export function draftReachRequest(
	owner: string | undefined,
	choice: ReachChoice | undefined,
	poolIds: readonly string[],
): DraftReachRequest | undefined {
	if (!owner || !choice) return undefined;
	if (choice === "scope") return { owner, poolIds: [] };
	return poolIds.length > 0 ? { owner, poolIds } : undefined;
}

function refLabel(ref: ReachRef): string {
	return ref.displayName || ref.name;
}

function unique(items: readonly string[]): string[] {
	return [...new Set(items)];
}

function viaLabel(via: ReachVia): string {
	if (via.pool) return refLabel(via.pool);
	if (via.account) return refLabel(via.account);
	return "this scope's keys";
}

/** "via Pool A, Pool B · Build tier": what brings the model, in `poolOrder`, and the upstream tiers that allow it. */
export function reachViaLine(
	model: ReachedModel,
	poolOrder: readonly string[],
): string | undefined {
	const rank = (v: ReachVia): number => {
		const i = v.pool ? poolOrder.indexOf(v.pool.id) : -1;
		return i === -1 ? poolOrder.length : i;
	};
	const sources = unique(
		[...(model.via ?? [])].sort((a, b) => rank(a) - rank(b)).map(viaLabel),
	);
	const tiers = unique(
		(model.upstream ?? []).flatMap((u) =>
			u.allowed && u.policy ? [refLabel(u.policy)] : [],
		),
	);
	const parts: string[] = [];
	if (sources.length > 0) parts.push(`via ${sources.join(", ")}`);
	if (tiers.length > 0) parts.push(tiers.join(", "));
	return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** The picker's view of a reach: each served model, its hosts and via line. */
export function pickerReachFrom(
	reachable: Reachable,
	poolOrder: readonly string[],
): PickerReach {
	const models = new Map<string, PickerReachModel>();
	for (const m of reachable.models ?? []) {
		models.set(pickerReachKey(m.provider.name, m.model.name), {
			hostNames: (m.hosts ?? []).map((h) => h.name),
			note: reachViaLine(m, poolOrder),
		});
	}
	return { models };
}

/** A model the reach binds at a host but may not use. */
export interface ExcludedRow {
	id: string;
	label: string;
	ref: string;
	reason: string;
}

/** Excluded models, once each; one the reach serves at another host isn't listed. */
export function excludedRows(reachable: Reachable): ExcludedRow[] {
	const served = new Set((reachable.models ?? []).map((m) => m.model.id));
	const rows = new Map<string, ExcludedRow>();
	for (const e of reachable.excluded ?? []) {
		if (served.has(e.model.id) || rows.has(e.model.id)) continue;
		rows.set(e.model.id, {
			id: e.model.id,
			label: refLabel(e.model),
			ref: pickerReachKey(e.provider.name, e.model.name),
			reason: e.reason,
		});
	}
	return [...rows.values()];
}

interface ReachRow {
	provider: string;
	model: string;
	hosts: readonly string[];
}

function refMatchesRow(ref: CatalogRef, row: ReachRow): boolean {
	if (ref.provider !== undefined && ref.provider !== row.provider) return false;
	if (ref.model !== undefined && ref.model !== row.model) return false;
	return ref.host === undefined || row.hosts.includes(ref.host);
}

function reachRow(m: {
	provider: ReachRef;
	model: ReachRef;
	hosts: ReachRef[] | null;
}): ReachRow {
	return {
		provider: m.provider.name,
		model: m.model.name,
		hosts: (m.hosts ?? []).map((h) => h.name),
	};
}

/**
 * A warning per picked entry the reach can't serve, keyed by the entry as
 * written. An entry matching any served model is fine, so a provider entry
 * warns only when every model of it the reach binds is excluded; one matching
 * nothing the reach binds warns that the reach doesn't serve it.
 */
export function entryWarnings(
	entries: readonly string[],
	reachable: Reachable,
): Map<string, string> {
	const served = (reachable.models ?? []).map(reachRow);
	const excluded = (reachable.excluded ?? []).map((e) => ({
		row: reachRow(e),
		reason: e.reason.replace(/\.$/, ""),
	}));
	const warnings = new Map<string, string>();
	for (const ref of parseValidRefs(entries)) {
		if (served.some((row) => refMatchesRow(ref, row))) continue;
		const reasons = unique(
			excluded.filter((e) => refMatchesRow(ref, e.row)).map((e) => e.reason),
		);
		const [first] = reasons;
		if (first === undefined) {
			warnings.set(ref.raw, "Not served through this reach.");
			continue;
		}
		const more = reasons.length > 1 ? ` (and ${reasons.length - 1} more)` : "";
		warnings.set(ref.raw, `Requests for it will be refused: ${first}${more}.`);
	}
	return warnings;
}

/** What the models picker shows for a draft reach. */
export interface DraftReachView {
	/** Why the list isn't narrowed to the reach, or that it's being checked. */
	note?: string;
	/** The reach the list is narrowed to; picked entries are checked against it. */
	checked?: Reachable;
	/** Set with `checked`; the picker then lists only its models. */
	pickerReach?: PickerReach;
	excluded: ExcludedRow[];
}

const CHECKING = "Checking what this reach serves…";

export function draftReachView({
	choice,
	poolIds,
	requested,
	data,
	isError,
	isStale,
}: {
	choice: ReachChoice | undefined;
	poolIds: readonly string[];
	/** Whether a read was sent: false when the owner has no scope to read in. */
	requested: boolean;
	data: Reachable | undefined;
	isError: boolean;
	/** `data` is the previous reach's, shown while this one loads. */
	isStale: boolean;
}): DraftReachView {
	const unnarrowed = (note: string): DraftReachView => ({
		note,
		excluded: [],
	});
	if (!choice) {
		return unnarrowed("Choose a reach above to see which models it serves.");
	}
	if (choice === "pools" && poolIds.length === 0) {
		return unnarrowed("Add a pool to see which models it serves.");
	}
	if (!requested || isError) {
		return unnarrowed("Couldn't check what this reach serves.");
	}
	if (!data) return unnarrowed(CHECKING);
	if (data.refused) {
		return unnarrowed(
			`Requests under this reach are refused: ${data.refused.reason.replace(/\.$/, "")}.`,
		);
	}
	return {
		note: isStale ? CHECKING : undefined,
		checked: data,
		pickerReach: pickerReachFrom(data, poolIds),
		excluded: excludedRows(data),
	};
}
