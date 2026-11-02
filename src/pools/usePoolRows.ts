import { useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, usePools } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";

export interface PoolRow {
	pool: Pool;
	host: Host | undefined;
	hostLabel: string;
}

/** Pool rows with their host, filtered by the search box. */
export function usePoolRows() {
	const { data: poolsData } = usePools();
	const { data: hostsData } = useHosts();
	const [q, setQ] = useState("");

	const hostById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostById.set(h.metadata.id, h);
	}

	const allRows: PoolRow[] = (poolsData.items ?? []).map((pool) => {
		const host = hostById.get(pool.spec.hostId);
		return {
			pool,
			host,
			hostLabel: host
				? displayLabel(host.metadata)
				: `Unknown (${pool.spec.hostId.slice(0, 6)}…)`,
		};
	});
	const needle = q.trim().toLowerCase();
	const rows = needle
		? allRows.filter(
				(r) =>
					displayLabel(r.pool.metadata).toLowerCase().includes(needle) ||
					r.pool.metadata.name.includes(needle) ||
					r.hostLabel.toLowerCase().includes(needle),
			)
		: allRows;

	return { rows, total: allRows.length, q, setQ };
}
