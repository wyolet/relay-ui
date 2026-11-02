import type { ModelHostView, ModelPolicyView } from "@/api/hooks/models";
import type { Model, ModelCapabilities } from "@/api/types/model";

/** One line on a model's deprecation: status, sunset, successor. */
export function deprecationNote(m: Model): string | null {
	const d = m.spec.deprecation;
	const date = m.spec.deprecationDate;
	if (!d && !date) return null;
	const parts: string[] = [];
	if (d?.status) parts.push(d.status);
	if (d?.sunsetDate) parts.push(`sunsets ${d.sunsetDate}`);
	else if (date) parts.push(`deprecated ${date}`);
	if (d?.replacement) parts.push(`successor → ${d.replacement}`);
	return parts.join(" · ") || null;
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

export function overviewCounts(
	hostRows: ModelHostView[],
	policyRows: ModelPolicyView[],
): { enabledHosts: number; throttledPolicies: number } {
	return {
		enabledHosts: hostRows.filter((h) => h.binding.enabled).length,
		throttledPolicies: policyRows.filter((p) => (p.limits?.length ?? 0) > 0)
			.length,
	};
}
