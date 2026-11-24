import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { agentRemovalPlan, type RemovalWrite } from "@/agent-page/removalPlan";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { useDeleteKey, useKeysForPrincipals } from "@/api/hooks/keys";
import {
	policiesListQuery,
	policiesListQueryOptions,
	useDeletePolicy,
} from "@/api/hooks/policies";
import {
	usePolicyBindings,
	useSetAccountPolicy,
} from "@/api/hooks/policyBindings";
import { poolListQuery, useDeletePool } from "@/api/hooks/pools";
import { useDeleteServiceAccount } from "@/api/hooks/serviceAccounts";
import { failureMessage, useWriteRunner } from "@/hooks/useWriteRunner";
import { AGENT_ID_LABEL } from "@/lib/agentLabel";
import { displayLabel } from "@/lib/displayLabel";
import { ownAccount } from "@/policy-bindings/accountLookup";
import type { CheckOption } from "@/shared/MultiSelect";
import { toast } from "@/shared/Toast";
import type { ShortcutTarget } from "@/shortcuts/registry";

/** What removing an agent deletes and keeps, and the run that deletes it. */
export function useAgentRemoval(target: ShortcutTarget) {
	const navigate = useNavigate();
	const selector = [`${AGENT_ID_LABEL}=${target.id}`];
	const keys = useKeysForPrincipals([target.id]);
	const accounts = useQuery(accountListQueryOptions);
	const bindings = usePolicyBindings();
	const policies = useQuery(policiesListQueryOptions);
	const labelledPolicies = useQuery(policiesListQuery({ label: selector }));
	const labelledPools = useQuery(poolListQuery({ label: selector }));
	const reads = [
		keys,
		accounts,
		bindings,
		policies,
		labelledPolicies,
		labelledPools,
	];
	const failedRead = reads.find((r) => r.error);

	const [keptIds, setKeptIds] = useState<ReadonlySet<string>>(new Set());
	const [typed, setTyped] = useState("");

	const plan = agentRemovalPlan({
		serviceAccount: { id: target.id, label: target.label },
		keys: keys.data?.items ?? [],
		account: ownAccount(accounts.data?.items ?? [], {
			kind: "serviceaccount",
			id: target.id,
		}),
		bindings: bindings.data?.items ?? [],
		labelledPolicies: labelledPolicies.data?.items ?? [],
		labelledPools: labelledPools.data?.items ?? [],
		policies: policies.data?.items ?? [],
		keptIds,
	});

	const labelled = [
		...(labelledPolicies.data?.items ?? []).map((p) => ({
			id: p.metadata.id ?? "",
			label: `Policy ${displayLabel(p.metadata)}`,
		})),
		...(labelledPools.data?.items ?? []).map((p) => ({
			id: p.metadata.id ?? "",
			label: `Pool ${displayLabel(p.metadata)}`,
		})),
	].filter((row) => row.id);
	const options: CheckOption[] = labelled.map((row) => {
		const kept = plan.kept.find((k) => k.id === row.id);
		return {
			value: row.id,
			label: row.label,
			hint: kept ? (kept.inUse ? `Kept: ${kept.reason}` : "Kept") : undefined,
			disabled: kept?.inUse ?? false,
		};
	});
	const ticked = labelled
		.filter((row) => !plan.kept.some((k) => k.id === row.id))
		.map((row) => row.id);

	function toggle(id: string) {
		setKeptIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const deleteKey = useDeleteKey();
	const setAccountPolicy = useSetAccountPolicy();
	const deleteServiceAccount = useDeleteServiceAccount();
	const deletePolicy = useDeletePolicy();
	const deletePool = useDeletePool();

	async function runWrite(write: RemovalWrite): Promise<void> {
		switch (write.kind) {
			case "key":
				await deleteKey.mutateAsync(write.keyId);
				return;
			case "unbind":
				await setAccountPolicy.mutateAsync({
					accountRef: write.accountId,
					policyId: null,
				});
				return;
			case "serviceAccount":
				await deleteServiceAccount.mutateAsync(write.serviceAccountId);
				return;
			case "policy":
				await deletePolicy.mutateAsync(write.policyId);
				return;
			case "pool":
				await deletePool.mutateAsync(write.poolId);
				return;
		}
	}

	const runner = useWriteRunner(runWrite);

	function finished(done: boolean) {
		if (!done) return;
		toast("success", `Agent "${target.label}" removed.`);
		void navigate({ to: "/service-accounts" });
	}

	const loaded = reads.every((r) => r.data !== undefined);

	return {
		loaded,
		loadError: failedRead ? failureMessage(failedRead.error) : null,
		planned: plan.deletes.map((w) => ({
			id: w.id,
			label: w.label,
			status: "waiting" as const,
		})),
		options,
		ticked,
		toggle,
		typed,
		setTyped,
		canRemove: loaded && typed === target.name,
		remove() {
			void runner.start(plan.deletes).then(finished);
		},
		run: {
			phase: runner.phase,
			error: runner.error,
			doneCount: runner.doneCount,
			items: runner.steps.map(({ write, status }) => ({
				id: write.id,
				label: write.label,
				status,
			})),
			retry() {
				void runner.retry().then(finished);
			},
			reset: runner.reset,
		},
	};
}
