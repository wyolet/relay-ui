import type { Host } from "@/api/types/host";
import { useHostReferences } from "@/hosts/useHostReferences";

/** The counts the host Overview cards show. */
export function useHostOverview(host: Host) {
	const refs = useHostReferences(host);
	return {
		models: refs.models.length,
		enabledModels: refs.enabledModels.length,
		credentials: refs.hostKeys.length,
		enabledCredentials: refs.hostKeys.filter((hk) => hk.spec.enabled !== false)
			.length,
		tierPresets: refs.hostPolicies.length,
		userPolicies: refs.userPolicies.length,
	};
}
