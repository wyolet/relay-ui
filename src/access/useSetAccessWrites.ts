import { useRef, useState } from "react";
import {
	type AccessPlanWrite,
	accessSpec,
	linkedPoolIds,
	type PoolLink,
} from "@/access/accessPlan";
import type { AccessTarget } from "@/access/accessTarget";
import { scopeReceiver } from "@/agents/agentOwner";
import {
	type AccessProgress,
	emptyAccessProgress,
	useAccessWrites,
} from "@/agents/useAccessWrites";
import { useWriteRunner } from "@/hooks/useWriteRunner";
import { accessRowLabels } from "@/lib/agentLabel";
import { scopeOwner } from "@/lib/ownerPick";
import { required } from "@/lib/required";
import type { OwnPolicyCase } from "@/policy-bindings/ownPolicy";
import {
	type OwnPolicyProgress,
	useOwnPolicyWrites,
} from "@/policy-bindings/useOwnPolicyWrites";

export interface AccessSettings {
	target: AccessTarget;
	/** The case as the form showed it; a run never re-reads it. */
	policyCase: OwnPolicyCase;
	/** Linked first, in their order. */
	keptPoolIds: readonly string[];
	/** Then a pool per picked host: the current one, or the one the run makes. */
	poolLinks: readonly PoolLink[];
	models: readonly string[];
}

export interface SavedAccess {
	/** The policy the target is under now. */
	policyName: string;
}

interface Progress extends AccessProgress, OwnPolicyProgress {}

/** Sends an access save's writes in order, each reading the ids the earlier ones returned. */
export function useSetAccessWrites() {
	const access = useAccessWrites();
	const runOwnPolicyWrite = useOwnPolicyWrites();

	const settingsRef = useRef<AccessSettings | null>(null);
	const progress = useRef<Progress>(emptyAccessProgress());
	const [saved, setSaved] = useState<SavedAccess | null>(null);

	async function runWrite(write: AccessPlanWrite): Promise<void> {
		const settings = required(settingsRef.current ?? undefined, "access");
		const { target } = settings;
		const made = progress.current;
		const owner = scopeOwner(target.scope);
		if (write.kind === "share" || write.kind === "pool") {
			await access.runAccessWrite(write, made, {
				receiver: scopeReceiver(target.scope),
				owner,
				labels: accessRowLabels(target.accountId),
			});
			return;
		}
		await runOwnPolicyWrite(
			write,
			made,
			settings.policyCase,
			{
				accountId: target.accountId,
				owner,
				displayName: `${target.label} access`,
			},
			(spec) =>
				accessSpec(
					spec,
					linkedPoolIds(settings.keptPoolIds, settings.poolLinks, made.poolIds),
					settings.models,
				),
		);
	}

	const runner = useWriteRunner(runWrite);

	function savedAccess(): SavedAccess {
		return {
			policyName: required(progress.current.policy?.metadata.name, "policy"),
		};
	}

	return {
		phase: runner.phase,
		error: runner.error,
		steps: runner.steps,
		doneCount: runner.doneCount,
		saved,
		retry: async () => {
			if (await runner.retry()) setSaved(savedAccess());
		},
		reset() {
			setSaved(null);
			runner.reset();
		},
		async start(settings: AccessSettings, writes: readonly AccessPlanWrite[]) {
			settingsRef.current = settings;
			progress.current = emptyAccessProgress();
			setSaved(null);
			if (await runner.start(writes)) setSaved(savedAccess());
		},
	};
}
