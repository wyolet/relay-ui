import { useQuery } from "@tanstack/react-query";
import {
	canDeleteAccount,
	hostLabel,
	PROVIDER_KIND,
} from "@/accounts/accountView";
import { useHolderResolver } from "@/accounts/useHolderResolver";
import {
	useAccount,
	useAccountKeys,
	useDeleteAccount,
} from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { usePolicyBindings } from "@/api/hooks/policyBindings";
import { displayLabel } from "@/lib/displayLabel";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function useAccountDetail({
	name,
	onDeleted,
}: {
	name: string;
	onDeleted: () => void;
}) {
	const { data: account } = useAccount(name);
	const { data: keysData } = useAccountKeys(name);
	const { data: hostsData } = useHosts();
	const { data: bindingsData } = usePolicyBindings();
	const { data: policiesData } = useQuery(policiesListQueryOptions);
	const toHolder = useHolderResolver();
	const del = useConfirmedDelete(useDeleteAccount(), {
		noun: "account",
		onDeleted,
	});

	const { spec, metadata } = account;
	const accountId = metadata.id ?? "";
	const hostId = spec.hostId ?? "";
	const host = (hostsData.items ?? []).find((h) => h.metadata.id === hostId);
	const binding = (bindingsData?.items ?? []).find((b) =>
		(b.spec.accountIds ?? []).includes(accountId),
	);
	const policy = binding
		? (policiesData?.items ?? []).find(
				(p) => p.metadata.id === binding.spec.policyId,
			)
		: undefined;
	const owner = metadata.owner;

	function requestDelete() {
		del.request({
			id: accountId,
			name: metadata.name,
			label: displayLabel(metadata),
		});
	}

	return {
		account,
		isProvider: spec.kind === PROVIDER_KIND,
		holder: spec.holder ? toHolder(spec.holder) : undefined,
		ownerUser:
			owner?.kind === "user" && owner.id
				? toHolder({ kind: "user", id: owner.id })
				: undefined,
		binding: binding && {
			name: binding.metadata.name,
			label: displayLabel(binding.metadata),
			enabled: binding.spec.enabled ?? true,
			policy: policy && {
				name: policy.metadata.name,
				label: displayLabel(policy.metadata),
			},
		},
		keys: keysData.keys ?? [],
		host,
		hostLabel: hostLabel(host, hostId),
		deletable: canDeleteAccount(spec),
		del,
		requestDelete,
	};
}
