import type { Pool } from "@/api/hooks/pools";
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
	/** The policy's pools that hold the key, in failover order. */
	viaPools: { name: string; label: string }[];
}

/** The policies linking a host key (server-derived), resolved against the policy list. */
export function linkedPolicyRows(
	hk: HostKey,
	policies: readonly Policy[],
	pools: readonly Pool[],
): LinkedPolicyRow[] {
	const hkId = hk.metadata.id ?? "";
	const poolsById = new Map(pools.map((p) => [p.metadata.id, p]));
	return (hk.policies ?? []).map((ref) => {
		const match = policies.find((p) => p.metadata.id === ref.id);
		return {
			id: ref.id,
			name: ref.name,
			label: match ? displayLabel(match.metadata) : ref.name,
			hasDisplayName: match ? hasDisplayName(match.metadata) : false,
			description: match?.metadata.description?.trim() || undefined,
			enabled: match ? match.spec.enabled !== false : true,
			viaPools: (match?.spec.poolIds ?? []).flatMap((id) => {
				const pool = poolsById.get(id);
				return pool?.spec.credentialIds?.includes(hkId)
					? [{ name: pool.metadata.name, label: displayLabel(pool.metadata) }]
					: [];
			}),
		};
	});
}
