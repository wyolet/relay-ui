import { useState } from "react";
import { canShareAccount, shareUsageText } from "@/accounts/sharing";
import { useShareCaller } from "@/accounts/useShareCaller";
import {
	type Account,
	type AccountShareParty,
	useAccountShares,
	useDeleteAccount,
} from "@/api/hooks/accounts";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export interface SharedWithRow {
	/** The shared account's id and slug. */
	id: string;
	name: string;
	receiver: AccountShareParty;
	usage: string;
}

/** The accounts this provider account is shared with, for its owner, and the share and remove flows. */
export function useSharedWith(account: Account) {
	const canShare = canShareAccount(account, useShareCaller());
	const shares = useAccountShares(
		account.metadata.id ?? account.metadata.name,
		canShare,
	);
	const del = useConfirmedDelete(useDeleteAccount(), {
		noun: "shared account",
	});
	const [sharing, setSharing] = useState(false);

	let status: "loading" | "failed" | "ready" = "ready";
	if (shares.isError) status = "failed";
	else if (shares.isPending) status = "loading";

	const rows: SharedWithRow[] = (shares.data?.items ?? []).map((s) => ({
		id: s.sharedAccount.id,
		name: s.sharedAccount.name,
		receiver: s.receiver,
		usage: shareUsageText(s.usage),
	}));

	return {
		canShare,
		rows,
		status,
		sharing,
		openShare: () => setSharing(true),
		closeShare: () => setSharing(false),
		del,
		requestRemove: (row: SharedWithRow) =>
			del.request({ id: row.id, name: row.name, label: row.name }),
	};
}
