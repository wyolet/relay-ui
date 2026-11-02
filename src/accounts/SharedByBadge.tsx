import { AccountTag } from "@/accounts/AccountTag";

/** Marks a shared account: it uses the keys of an account `name` owns. */
export function SharedByBadge({ name }: { name: string }) {
	return (
		<AccountTag title="Uses the keys of the account it was shared from; only its owner changes them.">
			Shared by {name}
		</AccountTag>
	);
}
