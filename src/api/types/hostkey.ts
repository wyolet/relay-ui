import type { components } from "@/api/types.gen";

export type HostKey = components["schemas"]["HostKey"];
export type HostKeySpec = components["schemas"]["HostKeySpec"];
export type HostKeyValueFrom = components["schemas"]["HostKeyValueFrom"];
export type HostKeyListResponse = components["schemas"]["HostKeyList"];

export type HostKeyKind = "env" | "stored";

export type HostKeyCreate = components["schemas"]["HostKey"];
export type HostKeyUpdate = components["schemas"]["HostKey"];
