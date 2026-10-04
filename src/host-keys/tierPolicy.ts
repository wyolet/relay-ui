import type { Host } from "@/api/types/host";
import type { Policy } from "@/api/types/policy";

/** Relay only accepts a host key whose tier policy is owned by that same host. */
export function isHostTierPolicy(policy: Policy, hostId: string): boolean {
	const owner = policy.metadata.owner;
	return owner?.kind === "host" && owner.id === hostId;
}

/**
 * The tier policy a new host key should mirror: the host's `defaultPolicy` (an
 * id) when it is a valid tier, else the first tier policy the host owns.
 */
export function defaultTierPolicyId(
	host: Host,
	policies: readonly Policy[],
): string | undefined {
	const hostId = host.metadata.id ?? "";
	const tiers = policies.filter((p) => isHostTierPolicy(p, hostId));
	const preferred = tiers.find(
		(p) => p.metadata.id === host.spec.defaultPolicy,
	);
	return (preferred ?? tiers[0])?.metadata.id;
}
