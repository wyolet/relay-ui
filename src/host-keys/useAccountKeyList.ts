import { useState } from "react";
import { useAccount } from "@/api/hooks/accounts";
import { useAccountHostKeys, useHostKeysHealth } from "@/api/hooks/hostkeys";
import type { HostKey } from "@/api/types/hostkey";
import { type KeyHealthView, keyHealthView } from "@/host-keys/keyHealth";
import { useHostKeyDelete } from "@/host-keys/useHostKeyDelete";
import { useToggleHostKeyEnabled } from "@/host-keys/useToggleHostKeyEnabled";

export interface AccountKeyRow {
	id: string;
	name: string;
	kind: HostKey["spec"]["valueFrom"]["kind"];
	enabled: boolean;
	hostKey: HostKey;
	health: KeyHealthView;
}

/** A provider account's keys with their breaker health and per-key actions. */
export function useAccountKeyList(accountName: string) {
	const { data: account } = useAccount(accountName);
	const accountId = account.metadata.id ?? "";
	const { data } = useAccountHostKeys(accountId);
	const hostKeys = (data.items ?? []).flatMap((hk) =>
		hk.metadata.id ? [{ id: hk.metadata.id, hk }] : [],
	);
	const health = useHostKeysHealth(hostKeys.map((k) => k.id));
	const toggle = useToggleHostKeyEnabled();
	const { del, request: requestDelete } = useHostKeyDelete({});
	const [rotating, setRotating] = useState<HostKey | null>(null);

	const rows: AccountKeyRow[] = hostKeys.map(({ id, hk }, i) => ({
		id,
		name: hk.metadata.name,
		kind: hk.spec.valueFrom.kind,
		enabled: hk.spec.enabled ?? true,
		hostKey: hk,
		health: keyHealthView(health[i]?.data, health[i]?.isError ?? false),
	}));

	return {
		accountId,
		rows,
		setEnabled: (hk: HostKey, next: boolean) =>
			void toggle.setEnabled(hk, next),
		isToggling: toggle.isPending,
		rotating,
		openRotate: setRotating,
		closeRotate: () => setRotating(null),
		del,
		requestDelete,
	};
}
