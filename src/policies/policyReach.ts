import type {
	DraftReachRequest,
	Reachable,
	ReachRef,
} from "@/api/hooks/reachable";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { CatalogRef } from "@/lib/catalogRef";
import { parseValidRefs } from "@/lib/catalogRefToggle";
import {
	type PickerReach,
	type PickerReachModel,
	pickerReachKey,
} from "@/models/narrowPickerIndex";

/** A saved policy linking no pools uses every credential in its scope. */
export function everyCredentialFor(
	poolIds: readonly string[] | null | undefined,
): boolean {
	return !poolIds || poolIds.length === 0;
}

/**
 * The pools the every-credential switch leaves linked, and the ones it sets
 * aside: turning it on drops the pools but keeps them, so turning it off
 * restores them.
 */
export function poolIdsOnEveryCredentialSwitch(
	everyCredential: boolean,
	poolIds: readonly string[],
	setAside: readonly string[],
): { poolIds: string[]; setAside: string[] } {
	if (everyCredential) {
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

/** Ticking a pool appends it as the last failover; unticking drops it from the order. */
export function poolIdsOnToggle(
	poolIds: readonly string[],
	poolId: string,
): string[] {
	return poolIds.includes(poolId)
		? poolIds.filter((id) => id !== poolId)
		: [...poolIds, poolId];
}

/**
 * The draft-reach read for `owner` (a `kind:id` scope), as the policy of
 * `account` when given; none until there's a pool to read or the switch is on.
 */
export function draftReachRequest(
	owner: string | undefined,
	everyCredential: boolean,
	poolIds: readonly string[],
	account?: string,
): DraftReachRequest | undefined {
	if (!owner) return undefined;
	if (!everyCredential && poolIds.length === 0) return undefined;
	return {
		owner,
		poolIds: everyCredential ? [] : poolIds,
		...(account ? { account } : {}),
	};
}

/** The accounts `policyId` governs, in binding order; a disabled binding governs none. */
export function boundAccountIds(
	bindings: readonly Pick<PolicyBinding, "spec">[],
	policyId: string,
): string[] {
	const ids = bindings.flatMap((b) =>
		b.spec.policyId === policyId && b.spec.enabled !== false
			? (b.spec.accountIds ?? [])
			: [],
	);
	return unique(ids);
}

/** Which bound account the reach was read for, when the policy has more than one. */
export function boundAccountNote(
	accountLabel: string,
	otherCount: number,
): string | undefined {
	if (otherCount <= 0) return undefined;
	const others =
		otherCount === 1
			? "1 other bound account may differ"
			: `${otherCount} other bound accounts may differ`;
	return `Checked for ${accountLabel}; ${others}.`;
}

/** Reasons for linked pools, accounts and keys that bring nothing: on the pool row that's linked, else apart. */
export interface DroppedNotes {
	byPool: ReadonlyMap<string, readonly string[]>;
	other: readonly string[];
}

export function droppedNotes(
	dropped: Reachable["dropped"],
	poolIds: readonly string[],
): DroppedNotes {
	const byPool = new Map<string, string[]>();
	const other: string[] = [];
	for (const d of dropped ?? []) {
		const poolId = d.pool?.id;
		if (poolId && poolIds.includes(poolId)) {
			byPool.set(poolId, [...(byPool.get(poolId) ?? []), d.reason]);
		} else {
			other.push(d.reason);
		}
	}
	return { byPool, other };
}

/** Why a reach that serves nothing does: the ladder's refusal, else the first dropped link or excluded model. */
export function emptyReachReason(reachable: Reachable): string | undefined {
	if ((reachable.models ?? []).length > 0) return undefined;
	return (
		reachable.refused?.reason ??
		reachable.dropped?.[0]?.reason ??
		reachable.excluded?.[0]?.reason ??
		"none of their hosts serves a model"
	);
}

function refLabel(ref: ReachRef): string {
	return ref.displayName || ref.name;
}

function unique(items: readonly string[]): string[] {
	return [...new Set(items)];
}

/** The picker's view of a reach: each served model and its hosts. */
export function pickerReachFrom(reachable: Reachable): PickerReach {
	const models = new Map<string, PickerReachModel>();
	for (const m of reachable.models ?? []) {
		models.set(pickerReachKey(m.provider.name, m.model.name), {
			hostNames: (m.hosts ?? []).map((h) => h.name),
		});
	}
	return { models };
}

/** A model the reach binds at a host but may not use. */
export interface ExcludedRow {
	id: string;
	label: string;
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

export const NOT_SERVED = "Not served by these credentials.";

/**
 * Warnings per picked entry the reach can't serve, keyed by the entry as
 * written: relay's distinct reasons, verbatim. An entry matching any served
 * model is fine, so a provider entry warns only when every model of it the
 * reach binds is excluded; one matching nothing the reach binds gets
 * {@link NOT_SERVED}.
 */
export function entryWarnings(
	entries: readonly string[],
	reachable: Reachable,
): Map<string, readonly string[]> {
	const served = (reachable.models ?? []).map(reachRow);
	const excluded = (reachable.excluded ?? []).map((e) => ({
		row: reachRow(e),
		reason: e.reason,
	}));
	const warnings = new Map<string, readonly string[]>();
	for (const ref of parseValidRefs(entries)) {
		if (served.some((row) => refMatchesRow(ref, row))) continue;
		const reasons = unique(
			excluded.filter((e) => refMatchesRow(ref, e.row)).map((e) => e.reason),
		);
		warnings.set(ref.raw, reasons.length > 0 ? reasons : [NOT_SERVED]);
	}
	return warnings;
}

/** What the models picker shows for a draft reach. */
export interface DraftReachView {
	/** Why the list isn't narrowed to the reach, or that it's being checked. */
	note?: string;
	/** The reach the list is narrowed to; picked entries are checked against it. */
	checked?: Reachable;
	/** Set when the reach serves something; the picker then lists only its models. */
	pickerReach?: PickerReach;
	excluded: ExcludedRow[];
	dropped: DroppedNotes;
	/** Which bound account the read stands for, when there are several. */
	accountNote?: string;
}

const CHECKING = "Checking which models these credentials serve…";
// Nothing is pickable until a reach says what it serves.
const SERVES_NOTHING: PickerReach = { models: new Map() };
const NO_DROPPED: DroppedNotes = { byPool: new Map(), other: [] };

export function draftReachView({
	everyCredential,
	poolIds,
	accountPending,
	requested,
	otherBoundAccounts,
	data,
	isError,
	isStale,
}: {
	everyCredential: boolean;
	poolIds: readonly string[];
	/** The bound account to read for is still loading. */
	accountPending: boolean;
	/** Whether a read was sent: false when the owner has no scope to read in. */
	requested: boolean;
	/** Bound accounts besides the one read for. */
	otherBoundAccounts: number;
	data: Reachable | undefined;
	isError: boolean;
	/** `data` is the previous reach's, shown while this one loads. */
	isStale: boolean;
}): DraftReachView {
	const nothing = (note: string): DraftReachView => ({
		note,
		excluded: [],
		dropped: NO_DROPPED,
		pickerReach: SERVES_NOTHING,
	});
	if (!everyCredential && poolIds.length === 0) {
		return nothing(
			"Pick pools, or turn on Every credential in scope, to see the models they serve.",
		);
	}
	if (accountPending) return nothing(CHECKING);
	// A relay without the reach read (or a refused owner) keeps the whole catalog
	// listed, so the form still works there.
	if (!requested || isError) {
		return {
			note: "Couldn't check which models these credentials serve.",
			excluded: [],
			dropped: NO_DROPPED,
		};
	}
	if (!data) return nothing(CHECKING);
	const read = {
		dropped: droppedNotes(data.dropped, poolIds),
		accountNote: data.account
			? boundAccountNote(refLabel(data.account), otherBoundAccounts)
			: undefined,
	};
	const source = everyCredential
		? {
				through: "this scope's credentials",
				serve: "This scope's credentials serve",
			}
		: { through: "these pools", serve: "These pools serve" };
	if (data.refused) {
		return {
			...read,
			note: `Requests through ${source.through} are refused: ${data.refused.reason}`,
			excluded: [],
			pickerReach: SERVES_NOTHING,
		};
	}
	const emptyReason = emptyReachReason(data);
	// Picked entries stay in the summary (removable, flagged) even when nothing is pickable.
	return {
		...read,
		note: emptyReason
			? `${source.serve} no models: ${emptyReason}`
			: isStale
				? CHECKING
				: undefined,
		checked: data,
		pickerReach: emptyReason ? SERVES_NOTHING : pickerReachFrom(data),
		excluded: excludedRows(data),
	};
}
