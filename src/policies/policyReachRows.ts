import type { PolicyHostView } from "@/policies/usePolicyHosts";

/** A host's key standing: keyed, keyless where requests fail, or keyless with a sibling covering it. */
export type HostKeyState = "keyed" | "breaking" | "optional";

type KeyedRow = {
	hostKeys: readonly unknown[] | null;
	requirement: PolicyHostView["requirement"];
};
type LabeledRow = {
	host: Pick<PolicyHostView["host"], "name" | "displayName">;
};

export function hostKeyState(row: KeyedRow): HostKeyState {
	if ((row.hostKeys?.length ?? 0) > 0) return "keyed";
	return row.requirement === "required" ? "breaking" : "optional";
}

export const KEYLESS_HOST_TEXT: Record<
	Exclude<HostKeyState, "keyed">,
	string
> = {
	breaking: "No key — requests here will fail",
	optional: "No key — a sibling host can cover these models",
};

const STATE_ORDER: Record<HostKeyState, number> = {
	breaking: 0,
	optional: 1,
	keyed: 2,
};

export function hostLabel(row: LabeledRow): string {
	return row.host.displayName?.trim() || row.host.name;
}

/** Breaking hosts first, then optional ones, then keyed; by label within each. */
export function sortByKeyState<T extends KeyedRow & LabeledRow>(
	rows: readonly T[],
): T[] {
	return [...rows].sort(
		(a, b) =>
			STATE_ORDER[hostKeyState(a)] - STATE_ORDER[hostKeyState(b)] ||
			hostLabel(a).localeCompare(hostLabel(b)),
	);
}

/** Models a policy grants, each counted once however many hosts serve it. */
export function distinctModelCount(
	rows: readonly { provider: { name: string }; model: { name: string } }[],
): number {
	return new Set(rows.map((r) => `${r.provider.name}/${r.model.name}`)).size;
}
