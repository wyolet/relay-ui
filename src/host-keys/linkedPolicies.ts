import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

export interface LinkedPolicyRow {
	id: string;
	name: string;
	label: string;
	hasDisplayName: boolean;
	description: string | undefined;
	enabled: boolean;
	/** Linked by `credentialIds`; false when the key is reached through a pool. */
	direct: boolean;
}

/** The policies linking a host key (server-derived), resolved against the policy list. */
export function linkedPolicyRows(
	hk: HostKey,
	policies: readonly Policy[],
): LinkedPolicyRow[] {
	const hkId = hk.metadata.id ?? "";
	return (hk.policies ?? []).map((ref) => {
		const match = policies.find((p) => p.metadata.id === ref.id);
		return {
			id: ref.id,
			name: ref.name,
			label: match ? displayLabel(match.metadata) : ref.name,
			hasDisplayName: match ? hasDisplayName(match.metadata) : false,
			description: match?.metadata.description?.trim() || undefined,
			enabled: match ? match.spec.enabled !== false : true,
			direct: (match?.spec.credentialIds ?? []).includes(hkId),
		};
	});
}
