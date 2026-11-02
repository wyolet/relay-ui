import { useAccounts } from "@/api/hooks/accounts";
import type { Host } from "@/api/types/host";
import { useHostReferences } from "@/hosts/useHostReferences";
import { displayLabel } from "@/lib/displayLabel";

/** The host's credentials, each with the label of the account it belongs to. */
export function useHostCredentials(host: Host) {
	const { hostKeys } = useHostReferences(host);
	const { data: accountsData } = useAccounts();

	const accountLabel = new Map<string, string>();
	for (const a of accountsData.items ?? []) {
		if (a.metadata.id)
			accountLabel.set(a.metadata.id, displayLabel(a.metadata));
	}

	return hostKeys.map((hostKey) => ({
		hostKey,
		account: hostKey.spec.accountId
			? accountLabel.get(hostKey.spec.accountId)
			: undefined,
	}));
}
