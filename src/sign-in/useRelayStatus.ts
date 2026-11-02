import { useQuery } from "@tanstack/react-query";
import { whoamiQueryOptions } from "@/api/auth";

export type RelayStatus = "alive" | "unreachable" | "checking";

/** Polls whoami so the sign-in page shows whether the relay answers. */
export function useRelayStatus(): RelayStatus {
	const { data, isError, isLoading } = useQuery({
		...whoamiQueryOptions,
		retry: false,
		refetchInterval: 5_000,
	});
	const reachable = !isLoading && !isError && data !== undefined;
	return reachable ? "alive" : isError ? "unreachable" : "checking";
}
