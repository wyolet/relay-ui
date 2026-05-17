import type { HostKeyKind } from "@/api/types/hostkey";

export type { HostKeyKind };

export const HOST_KEY_KINDS: readonly HostKeyKind[] = [
	"stored",
	"env",
] as const;
