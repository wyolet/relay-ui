import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type LicenseInfo = components["schemas"]["Info"];

/** Feature names the license file gates. Mirrors app/license. */
export const FEATURE_CUSTOM_ROLES = "custom-roles";

export const licenseQueryOptions = queryOptions({
	queryKey: ["license"] as const,
	queryFn: async (): Promise<LicenseInfo> => {
		const data = unwrap(await apiClient.GET("/license"));
		return data;
	},
	staleTime: 5 * 60_000,
	gcTime: 30 * 60_000,
	retry: false,
});

/** Non-suspending: a page renders while the license is unknown, and a
 * caller that cannot read /license is treated as unlicensed. */
export function useHasLicenseFeature(feature: string): boolean {
	const { data } = useQuery(licenseQueryOptions);
	return (data?.features ?? []).includes(feature);
}
