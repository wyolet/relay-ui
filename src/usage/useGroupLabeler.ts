import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import type { UsageGroupBy } from "@/api/hooks/usage";
import { usersListQueryOptions } from "@/api/hooks/users";
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
	const teams = useQuery({
		...teamsListQueryOptions,
		enabled: groupBy === "team_id",
	});
	const projects = useQuery({
		...projectsListQueryOptions,
		enabled: groupBy === "project_id",
	});
	// A principal id is either a service account or a user account, so both
	// lists are needed to name one.
	const serviceAccounts = useQuery({
		...serviceAccountsListQueryOptions,
		enabled: groupBy === "principal_id",
	});
	const users = useQuery({
		...usersListQueryOptions,
		enabled: groupBy === "principal_id",
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
		else if (groupBy === "team_id")
			map = index(
				teams.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "project_id")
			map = index(
				projects.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
		else if (groupBy === "principal_id") {
			map = index(
				serviceAccounts.data?.items,
				(r) => r.metadata.id,
				(r) => r.metadata,
			);
			for (const u of users.data ?? [])
				map.set(u.id, u.username || u.email || u.id);
		}

		return (value: string) => map?.get(value) ?? value;
	}, [
		groupBy,
		models.data,
		hosts.data,
		policies.data,
		hostKeys.data,
		keys.data,
		teams.data,
		projects.data,
		serviceAccounts.data,
		users.data,
	]);
}
