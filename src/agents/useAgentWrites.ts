import { useRef, useState } from "react";
import { type AgentScope, scopeReceiver } from "@/agents/agentOwner";
import type { AgentWrite } from "@/agents/agentWrites";
import {
	type AccessProgress,
	emptyAccessProgress,
	useAccessWrites,
} from "@/agents/useAccessWrites";
import { useCreateKey } from "@/api/hooks/keys";
import { useCreatePolicy } from "@/api/hooks/policies";
import { useSetAccountPolicy } from "@/api/hooks/policyBindings";
import { useCreateServiceAccount } from "@/api/hooks/serviceAccounts";
import { useWriteRunner } from "@/hooks/useWriteRunner";
import { expiryPatch } from "@/keys/useKeyForm";
import { agentLabels, agentRowLabels } from "@/lib/agentLabel";
import { scopeOwner } from "@/lib/ownerPick";
import { required } from "@/lib/required";
import { slugWithSuffix } from "@/lib/slug";

export interface AgentSettings {
	/** The service account's slug. */
	name: string;
	displayName: string;
	description: string;
	projectId: string;
	scope: AgentScope;
	key: {
		displayName: string;
		expiresAt: string;
		passthroughAllowed: boolean;
		payloadLoggingEnabled: boolean;
	};
}

export interface CreatedAgent {
	serviceAccountName: string;
	keyName: string;
	plaintext: string;
	/** The policy the form made; none when it bound an existing one or made none. */
	policyName?: string;
}

interface Progress extends AccessProgress {
	serviceAccountId?: string;
	serviceAccountName?: string;
	laneAccountId?: string;
	policyId?: string;
	policyName?: string;
}

/** Sends an agent's writes in order, each reading the ids the earlier ones returned. */
export function useAgentWrites() {
	const access = useAccessWrites();
	const createServiceAccount = useCreateServiceAccount();
	const createPolicy = useCreatePolicy();
	const setAccountPolicy = useSetAccountPolicy();
	const createKey = useCreateKey();

	const settingsRef = useRef<AgentSettings | null>(null);
	const progress = useRef<Progress>(emptyAccessProgress());
	const [created, setCreated] = useState<CreatedAgent | null>(null);

	async function runWrite(write: AgentWrite): Promise<void> {
		const settings = required(settingsRef.current ?? undefined, "agent");
		const made = progress.current;
		const owner = scopeOwner(settings.scope);
		switch (write.kind) {
			case "serviceAccount": {
				const sa = await createServiceAccount.mutateAsync({
					metadata: {
						name: settings.name,
						displayName: settings.displayName,
						description: settings.description,
						labels: agentLabels(),
						owner: { kind: "project", id: settings.projectId },
					},
					spec: { projectId: settings.projectId, enabled: true },
				});
				made.serviceAccountId = sa.metadata.id;
				made.serviceAccountName = sa.metadata.name;
				return;
			}
			case "laneAccount": {
				made.laneAccountId = await access.openedAccount({
					kind: "serviceaccount",
					id: required(made.serviceAccountId, "service account"),
				});
				return;
			}
			case "share":
			case "pool": {
				await access.runAccessWrite(write, made, {
					receiver: scopeReceiver(settings.scope),
					owner,
					labels: agentRowLabels(
						required(made.serviceAccountId, "service account"),
					),
				});
				return;
			}
			case "policy": {
				const policy = await createPolicy.mutateAsync({
					metadata: {
						name: slugWithSuffix(write.displayName),
						displayName: write.displayName,
						...(owner ? { owner } : {}),
						labels: agentRowLabels(
							required(made.serviceAccountId, "service account"),
						),
					},
					spec: {
						enabled: true,
						poolIds: made.poolIds.length > 0 ? made.poolIds : null,
						models: write.models,
					},
				});
				made.policyId = policy.metadata.id;
				made.policyName = policy.metadata.name;
				return;
			}
			case "bind": {
				await setAccountPolicy.mutateAsync({
					accountRef: required(made.laneAccountId, "agent's account"),
					policyId: required(write.policyId ?? made.policyId, "policy"),
				});
				return;
			}
			case "key": {
				const { plaintext, key } = await createKey.mutateAsync({
					metadata: {
						name: slugWithSuffix(settings.key.displayName),
						displayName: settings.key.displayName,
					},
					spec: {
						principal: {
							kind: "serviceaccount",
							id: required(made.serviceAccountId, "service account"),
						},
						enabled: true,
						passthroughAllowed: settings.key.passthroughAllowed,
						payloadLoggingEnabled: settings.key.payloadLoggingEnabled,
						...expiryPatch(settings.key.expiresAt),
					},
				});
				setCreated({
					serviceAccountName: required(
						made.serviceAccountName,
						"service account",
					),
					keyName: key.metadata.name,
					plaintext,
					policyName: made.policyName,
				});
				return;
			}
		}
	}

	const runner = useWriteRunner(runWrite);

	return {
		phase: runner.phase,
		error: runner.error,
		steps: runner.steps,
		doneCount: runner.doneCount,
		created,
		retry: runner.retry,
		reset() {
			setCreated(null);
			runner.reset();
		},
		start(settings: AgentSettings, writes: readonly AgentWrite[]) {
			settingsRef.current = settings;
			progress.current = emptyAccessProgress();
			setCreated(null);
			return runner.start(writes);
		},
	};
}
