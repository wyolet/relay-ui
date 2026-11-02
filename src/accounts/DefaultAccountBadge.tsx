import { AccountTag } from "@/accounts/AccountTag";

/** Marks the account Relay made for an owner's keys at a host. */
export function DefaultAccountBadge() {
	return (
		<AccountTag title="Created by Relay. Keys of this owner at this host join it when they name no account.">
			Default
		</AccountTag>
	);
}
