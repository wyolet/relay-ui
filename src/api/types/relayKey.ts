import type { components } from "@/api/types.gen";

export type RelayKey = components["schemas"]["RelayKey"];
export type RelayKeySpec = components["schemas"]["RelayKeySpec"];
export type RelayKeyList = components["schemas"]["RelayKeyList"];
export type CreateRelayKeyInput =
	components["schemas"]["createRelayKeyInputBody"];
export type CreateRelayKeyResponse =
	components["schemas"]["createRelayKeyResponseBody"];
export type RotateRelayKeyResponse =
	components["schemas"]["rotateRelayKeyResponseBody"];
