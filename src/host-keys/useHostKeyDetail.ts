import { useMemo, useState } from "react";
import { useDeleteHostKey, useHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import { useToggleHostKeyEnabled } from "@/host-keys/useToggleHostKeyEnabled";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useDetachHostKeyFromPolicy } from "@/policies/useDetachHostKeyFromPolicy";
import { toast } from "@/shared/Toast";

interface UseHostKeyDetailOptions {
	name: string;
	onDeleted: () => void;
}

export type HostKeyStatusTone = "active" | "warn" | "muted";

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

	hostPolicyLabel: string | null;
	hostPolicyName: string | null;
}

export interface AttachedPolicyRow {
	id: string;
	name: string;
	label: string;
	hasDisplayName: boolean;
	description: string | undefined;
	enabled: boolean;
	hostOwned: boolean;
	/** Count of host keys in this policy's hostKeyIds pool. */
	poolSize: number;
	/** Relay keys whose policyId === this policy id. */
	relayKeyCount: number;
}

export function useHostKeyDetail({ name, onDeleted }: UseHostKeyDetailOptions) {
	const { data: hk } = useHostKey(name);
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: relayKeysData } = useRelayKeys();
	const deleteHostKey = useDeleteHostKey();
	const { detach, isPending: isDetachPending } = useDetachHostKeyFromPolicy();
	const { setEnabled: setEnabledMutation, isPending: isToggling } =
		useToggleHostKeyEnabled();

	const [confirming, setConfirming] = useState(false);
	const [rotating, setRotating] = useState(false);

	const refs = hk.policies ?? [];

	const relayKeyCountByPolicy = useMemo(() => {
		const counts = new Map<string, number>();
		for (const rk of relayKeysData.items ?? []) {
			const pid = rk.spec.policyId;
			if (!pid) continue;
			counts.set(pid, (counts.get(pid) ?? 0) + 1);
		}
		return counts;
	}, [relayKeysData]);

	const attachedPolicies: AttachedPolicyRow[] = refs.map((ref) => {
		const match = (policiesData.items ?? []).find(
			(p) => p.metadata.id === ref.id,
		);
		const poolSize = match?.spec.hostKeyIds?.length ?? 0;
		return {
			id: ref.id,
			name: ref.name,
			label: match ? displayLabel(match.metadata) : ref.name,
			hasDisplayName: match ? hasDisplayName(match.metadata) : false,
			description: match?.metadata.description?.trim() || undefined,
			enabled: match ? match.spec.enabled !== false : true,
			hostOwned: match?.metadata.owner?.kind === "host",
			poolSize,
			relayKeyCount: relayKeyCountByPolicy.get(ref.id) ?? 0,
		};
	});

	const matchedHost = (hostsData.items ?? []).find(
		(h) => h.metadata.id === hk.spec.hostId,
	);
	const matchedHostPolicy = hk.spec.policyId
		? (policiesData.items ?? []).find((p) => p.metadata.id === hk.spec.policyId)
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

		hostPolicyLabel: hk.spec.policyId
			? matchedHostPolicy
				? displayLabel(matchedHostPolicy.metadata)
				: `Unknown (${hk.spec.policyId.slice(0, 8)}…)`
			: null,
		hostPolicyName: matchedHostPolicy?.metadata.name ?? null,
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
		setConfirming(true);
	}

	async function confirmDelete() {
		try {
			await deleteHostKey.mutateAsync(hk.metadata.id ?? "");
			toast("success", `Host key "${displayLabel(hk.metadata)}" deleted.`);
			onDeleted();
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete host key.",
			);
		}
	}

	function cancelDelete() {
		setConfirming(false);
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
			toast("success", "Host key id copied.");
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}

	return {
		hk,
		view,
		attachedPolicies,
		confirming,
		rotating,
		isDeletingPending: deleteHostKey.isPending,
		attemptDelete,
		confirmDelete,
		cancelDelete,
		openRotate,
		closeRotate,
		setEnabled,
		isToggling,
		detachFromPolicy,
		isDetachPending,
		copyId,
	};
}
