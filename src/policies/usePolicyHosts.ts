import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyHostView,
	policyHostsQueryOptions,
} from "@/api/hooks/policies";
import {
	type HostKeyState,
	hostKeyState,
	sortByKeyState,
} from "@/policies/policyReachRows";

export type { PolicyHostView };

/** Hosts this policy can reach, each with the host-keys that reach it. */
export function usePolicyHosts(ref: string): PolicyHostView[] {
	const { data } = useSuspenseQuery(policyHostsQueryOptions(ref));
	return data.hosts ?? [];
}

/** The policy's hosts with their key standing, the ones that need a key first. */
export function usePolicyHostsByKeyState(
	ref: string,
): { row: PolicyHostView; state: HostKeyState }[] {
	return sortByKeyState(usePolicyHosts(ref)).map((row) => ({
		row,
		state: hostKeyState(row),
	}));
}
