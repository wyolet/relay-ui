import { useSuspenseQuery } from "@tanstack/react-query";
import { type ModelHostView, modelHostsQueryOptions } from "@/api/hooks/models";

export type { ModelHostView };

/** Hosts serving this model, each with its binding and attached pricing. */
export function useModelHosts(ref: string): ModelHostView[] {
	const { data } = useSuspenseQuery(modelHostsQueryOptions(ref));
	return data.hosts ?? [];
}
