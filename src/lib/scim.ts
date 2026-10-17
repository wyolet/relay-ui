import { MAX_LEN, valid } from "@/lib/slug";

interface ClientState {
	name: string;
	revoked: boolean;
}

/**
 * The base URL an identity provider is configured with. SCIM mounts at the
 * root of the control listener, beside the `/api` prefix the admin API uses.
 */
export function scimBaseUrl(controlApiUrl: string): string {
	return `${controlApiUrl.replace(/\/+$/, "").replace(/\/api$/, "")}/scim/v2`;
}

/** Why a new client can't take `name`, or undefined when it can. */
export function scimClientNameError(
	name: string,
	clients: readonly ClientState[],
): string | undefined {
	if (!name) return "Name is required";
	if (name.length > MAX_LEN) return `At most ${MAX_LEN} characters`;
	if (!valid(name)) {
		return "Lowercase letters, digits and dashes, starting and ending with a letter or digit";
	}
	const taken = clients.find((c) => c.name === name);
	if (taken?.revoked) {
		return "A revoked client's name is never issued again — choose another";
	}
	if (taken) return "A client with this name already exists";
	return undefined;
}

/** Live tokens exist, yet /scim/v2 answers 404 to every one of them. */
export function scimDisabledWithClients(
	enabled: boolean,
	clients: readonly ClientState[],
): boolean {
	return !enabled && clients.some((c) => !c.revoked);
}
