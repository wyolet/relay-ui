import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type PolicyHostView,
	policyHostsQueryOptions,
} from "@/api/hooks/policies";

export type { PolicyHostView };

/** Hosts this policy can reach, each with the host-keys that reach it. */
export function usePolicyHosts(ref: string): PolicyHostView[] {
	const { data } = useSuspenseQuery(policyHostsQueryOptions(ref));
	return data.hosts ?? [];
}
