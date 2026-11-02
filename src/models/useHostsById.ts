import { useMemo } from "react";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";

/** Every host keyed by id, for resolving a model's host refs to full hosts. */
export function useHostsById(): Map<string, Host> {
	const { data: hostsData } = useHosts();
	return useMemo(() => {
		const m = new Map<string, Host>();
		for (const h of hostsData.items ?? []) {
			if (h.metadata.id) m.set(h.metadata.id, h);
		}
		return m;
	}, [hostsData]);
}
