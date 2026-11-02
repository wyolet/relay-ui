import {
	useAccount,
	useAccountKeys,
	useDeleteAccount,
} from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { displayLabel } from "@/lib/displayLabel";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function useAccountDetail({
	name,
	onDeleted,
}: {
	name: string;
	onDeleted: () => void;
}) {
	const { data: account } = useAccount(name);
	const { data: keysData } = useAccountKeys(name);
	const { data: hostsData } = useHosts();
	const del = useConfirmedDelete(useDeleteAccount(), {
		noun: "account",
		onDeleted,
	});

	const host = (hostsData.items ?? []).find(
		(h) => h.metadata.id === account.spec.hostId,
	);

	function requestDelete() {
		del.request({
			id: account.metadata.id ?? "",
			name: account.metadata.name,
			label: displayLabel(account.metadata),
		});
	}

	return {
		account,
		keys: keysData.keys ?? [],
		host,
		hostLabel: host
			? displayLabel(host.metadata)
			: `Unknown (${account.spec.hostId.slice(0, 8)}…)`,
		del,
		requestDelete,
	};
}
