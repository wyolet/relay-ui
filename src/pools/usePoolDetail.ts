import { useHosts } from "@/api/hooks/hosts";
import { useDeletePool, usePool, usePoolKeys } from "@/api/hooks/pools";
import { displayLabel } from "@/lib/displayLabel";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function usePoolDetail({
	name,
	onDeleted,
}: {
	name: string;
	onDeleted: () => void;
}) {
	const { data: pool } = usePool(name);
	const { data: keysData } = usePoolKeys(name);
	const { data: hostsData } = useHosts();
	const del = useConfirmedDelete(useDeletePool(), { noun: "pool", onDeleted });

	const host = (hostsData.items ?? []).find(
		(h) => h.metadata.id === pool.spec.hostId,
	);

	function requestDelete() {
		del.request({
			id: pool.metadata.id ?? "",
			name: pool.metadata.name,
			label: displayLabel(pool.metadata),
		});
	}

	return {
		pool,
		keys: keysData.keys ?? [],
		selection: pool.spec.selection ?? "prioritized",
		host,
		hostLabel: host
			? displayLabel(host.metadata)
			: `Unknown (${pool.spec.hostId.slice(0, 8)}…)`,
		del,
		requestDelete,
	};
}
