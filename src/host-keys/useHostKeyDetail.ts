import { useState } from "react";
import { useAccounts } from "@/api/hooks/accounts";
import { useDeleteHostKey, useHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { useDetachHostKeyFromPolicy, usePolicies } from "@/api/hooks/policies";
import { usePools } from "@/api/hooks/pools";
import type { Host } from "@/api/types/host";
import { useToggleHostKeyEnabled } from "@/host-keys/useToggleHostKeyEnabled";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { linkedPolicyRows } from "./linkedPolicies";

interface UseHostKeyDetailOptions {
	name: string;
	onDeleted: () => void;
}

export type HostKeyStatusTone = "active" | "warn" | "muted";

export interface HostKeyAccountView {
	label: string;
	name: string;
	orgId: string | undefined;
	isDefault: boolean;
}

export interface HostKeyDetailView {
	displayName: string;
	hasDisplayName: boolean;
	slug: string;
	description: string | undefined;
	id: string;
	enabled: boolean;
	statusTone: HostKeyStatusTone;
	statusLabel: string;

	isStored: boolean;
	sourceLabel: string;
	envVar: string | undefined;

	defaultTier: string | undefined;

	host: Host | undefined;
	hostLabel: string;
	/** Slug for linking to the host page; null if unresolved. */
	hostName: string | null;

	/** Null when the key names no account; label is a short id when unresolved. */
	account: HostKeyAccountView | null;
}

export function useHostKeyDetail({ name, onDeleted }: UseHostKeyDetailOptions) {
	const { data: hk } = useHostKey(name);
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: poolsData } = usePools();
	const { data: accountsData } = useAccounts();
	const del = useConfirmedDelete(useDeleteHostKey(), {
		noun: "credential",
		onDeleted,
	});
	const { detach, isPending: isDetachPending } = useDetachHostKeyFromPolicy();
	const { setEnabled: setEnabledMutation, isPending: isToggling } =
		useToggleHostKeyEnabled();

	const [rotating, setRotating] = useState(false);

	const refs = hk.policies ?? [];
	const attachedPolicies = linkedPolicyRows(
		hk,
		policiesData.items ?? [],
		poolsData.items ?? [],
	);

	const matchedHost = (hostsData.items ?? []).find(
		(h) => h.metadata.id === hk.spec.hostId,
	);
	const accountId = hk.spec.accountId;
	const matchedAccount = accountId
		? (accountsData.items ?? []).find((a) => a.metadata.id === accountId)
		: undefined;

	const enabled = hk.spec.enabled ?? true;
	const isStored = hk.spec.valueFrom.kind === "stored";

	const view: HostKeyDetailView = {
		displayName: displayLabel(hk.metadata),
		hasDisplayName: hasDisplayName(hk.metadata),
		slug: hk.metadata.name,
		description: hk.metadata.description?.trim() || undefined,
		id: hk.metadata.id ?? "",
		enabled,
		statusTone: enabled ? "active" : "warn",
		statusLabel: enabled ? "Enabled" : "Disabled",

		isStored,
		sourceLabel: isStored ? "Stored value" : "Environment variable",
		envVar: hk.spec.valueFrom.env?.trim() || undefined,

		defaultTier: hk.spec.defaultTier?.trim() || undefined,

		host: matchedHost,
		hostLabel: matchedHost
			? displayLabel(matchedHost.metadata)
			: `Unknown (${hk.spec.hostId.slice(0, 8)}…)`,
		hostName: matchedHost?.metadata.name ?? null,

		account: matchedAccount
			? {
					label: displayLabel(matchedAccount.metadata),
					name: matchedAccount.metadata.name,
					orgId: matchedAccount.spec.orgId?.trim() || undefined,
					isDefault: matchedAccount.spec.default === true,
				}
			: accountId
				? {
						label: `Unknown (${accountId.slice(0, 8)}…)`,
						name: accountId,
						orgId: undefined,
						isDefault: false,
					}
				: null,
	};

	function attemptDelete() {
		if (refs.length > 0) {
			const preview = refs
				.slice(0, 3)
				.map((r) => r.name)
				.join(", ");
			const overflow = refs.length > 3 ? ` (+${refs.length - 3} more)` : "";
			toast(
				"error",
				`Detach from ${refs.length} ${
					refs.length === 1 ? "policy" : "policies"
				} first: ${preview}${overflow}.`,
			);
			return;
		}
		del.request({
			id: hk.metadata.id ?? "",
			name: hk.metadata.name,
			label: displayLabel(hk.metadata),
		});
	}

	function openRotate() {
		setRotating(true);
	}

	function closeRotate() {
		setRotating(false);
	}

	async function setEnabled(next: boolean) {
		await setEnabledMutation(hk, next);
	}

	async function detachFromPolicy(policyId: string) {
		await detach({
			policyId,
			hostKeyId: hk.metadata.id ?? "",
			policies: policiesData.items ?? [],
		});
	}

	async function copyId() {
		if (!view.id) return;
		try {
			await navigator.clipboard.writeText(view.id);
			toast("success", "Credential id copied.");
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}

	return {
		hk,
		view,
		attachedPolicies,
		confirming: del.target !== null,
		rotating,
		isDeletingPending: del.isPending,
		deleteError: del.error,
		attemptDelete,
		confirmDelete: del.confirm,
		cancelDelete: del.cancel,
		openRotate,
		closeRotate,
		setEnabled,
		isToggling,
		detachFromPolicy,
		isDetachPending,
		copyId,
	};
}
