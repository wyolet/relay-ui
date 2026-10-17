import { CONTROL_API_URL } from "@/api/client";
import type { ScimClient } from "@/api/hooks/scimClients";
import { useAuthSCIM } from "@/api/hooks/settings";
import { scimBaseUrl, scimDisabledWithClients } from "@/lib/scim";

export const SCIM_BASE_URL = scimBaseUrl(CONTROL_API_URL);

/** Whether provisioning is on, and the warning when live tokens can't use it. */
export function useScimStatus(clients: readonly ScimClient[]) {
	const { data } = useAuthSCIM();
	const enabled = data.value.enabled;
	return {
		enabled,
		disabledWithClients: scimDisabledWithClients(enabled, clients),
	};
}
