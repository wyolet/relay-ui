import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { unwrap } from "@/api/unwrap";

export type LicenseInfo = components["schemas"]["Info"];

/** Feature names the license file gates. Mirrors app/license. */
export const FEATURE_CUSTOM_ROLES = "custom-roles";
export const FEATURE_SSO = "sso";

/** The relay's sentinel for "this needs a license", carried in the error
 * message of a rejected write (403 on a gated create, 400 on a gated
 * settings section). */
export function isLicenseRequired(error: unknown): boolean {
	return (
		error instanceof ApiError && error.body.message.includes("license_required")
	);
}

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

export function useLicense() {
	return useSuspenseQuery(licenseQueryOptions);
}

/** Installs a signed license file. An empty value clears the stored one and
 * the deployment falls back to the environment, else community. */
export function useInstallLicense() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (value: string): Promise<LicenseInfo> => {
			return unwrap(await apiClient.PUT("/license", { body: { value } }));
		},
		onSuccess: (info) => {
			queryClient.setQueryData(licenseQueryOptions.queryKey, info);
			// Gated settings sections decode differently once a license lands.
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			void queryClient.invalidateQueries({ queryKey: ["admin", "version"] });
		},
	});
}
