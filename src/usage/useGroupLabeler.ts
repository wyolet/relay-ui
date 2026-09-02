import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import type { UsageGroupBy } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";

type Labelable = { name: string; displayName?: string };

/**
 * Resolves a usage `group` value (a raw id/hash from /usage/summary) to a
 * human label. Only fetches the list the current dimension needs; returns the
 * raw value unchanged for un-resolvable dimensions (e.g. `source`) or until the
 * list loads.
 */
export function useGroupLabeler(
	groupBy: UsageGroupBy,
): (value: string) => string {
	const models = useQuery({
		...modelsListQueryOptions,
		enabled: groupBy === "model_id",
	});
	const hosts = useQuery({
		...hostsListQueryOptions,
		enabled: groupBy === "host_id",
	});
	const policies = useQuery({
		...policiesListQueryOptions,
		enabled: groupBy === "policy_id",
	});
	const hostKeys = useQuery({
		...hostKeysListQueryOptions,
		enabled: groupBy === "host_key_id",
	});
	const keys = useQuery({
		...keysListQueryOptions,
		enabled: groupBy === "relay_key_hash",
	});

	return useMemo(() => {
		function index<T>(
			items: readonly T[] | null | undefined,
			keyOf: (r: T) => string | undefined,
			labelOf: (r: T) => Labelable,
		): Map<string, string> {
			const m = new Map<string, string>();
			for (const it of items ?? []) {
				const k = keyOf(it);
				if (k) m.set(k, displayLabel(labelOf(it)));
			}
			return m;
		}

		let map: Map<string, string> | null = null;
		if (groupBy === "model_id")
			map = index(
				models.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "host_id")
			map = index(
				hosts.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "policy_id")
			map = index(
				policies.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "host_key_id")
			map = index(
				hostKeys.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "relay_key_hash")
			map = index(
				keys.data?.items,
				(r) => r.spec.keyHash,
				(r) => r.metadata,
			);

		return (value: string) => map?.get(value) ?? value;
	}, [
		groupBy,
		models.data,
		hosts.data,
		policies.data,
		hostKeys.data,
		keys.data,
	]);
}
