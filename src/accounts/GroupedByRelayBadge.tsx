import { AccountTag } from "@/accounts/AccountTag";

/** Marks an account whose keys Relay grouped by owner and host, not by a confirmed organization. */
export function GroupedByRelayBadge() {
	return (
		<AccountTag title="Relay grouped this owner's keys at this host when accounts arrived. They aren't confirmed to be one organization; set the organization id to confirm it.">
			Grouped by Relay
		</AccountTag>
	);
}
