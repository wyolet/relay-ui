import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type MyContext = components["schemas"]["MyContext"];

export const myContextsQueryOptions = queryOptions({
	queryKey: ["me", "contexts"] as const,
	queryFn: async (): Promise<MyContext[]> =>
		unwrap(await apiClient.GET("/me/contexts")) ?? [],
	staleTime: 30_000,
	gcTime: 5 * 60_000,
});
