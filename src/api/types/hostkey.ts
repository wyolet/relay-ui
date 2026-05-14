import type { components } from "@/api/types.gen";

export type Host = components["schemas"]["Host"];
export type HostKey = components["schemas"]["HostKey"];
export type HostKeySpec = components["schemas"]["HostKeySpec"] & {
	/** Write-only cleartext value (sibling of valueFrom). Backend will land this; treat as optional. */
	value?: string;
};
export type HostKeyValueFrom = components["schemas"]["HostKeyValueFrom"];

export type HostKeyKind = "env" | "stored";
export type HostKeyListResponse = components["schemas"]["HostKeyList"];

export type HostKeyCreate = components["schemas"]["HostKey"] & {
	spec: HostKeySpec;
};
export type HostKeyUpdate = HostKeyCreate;
