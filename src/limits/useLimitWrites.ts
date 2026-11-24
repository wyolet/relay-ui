import { useRef, useState } from "react";
import { useCreateBudget } from "@/api/hooks/budgets";
import { useCreateRateLimit } from "@/api/hooks/ratelimits";
import { useWriteRunner } from "@/hooks/useWriteRunner";
import { required } from "@/lib/required";
import { slugWithSuffix } from "@/lib/slug";
import {
	type LimitKind,
	type LimitLink,
	type LimitSpec,
	type LimitTarget,
	type LimitWrite,
	limitPolicyName,
	type SavedPolicyCase,
	savedPolicyCase,
	withBudgetLink,
	withRateLimitLink,
} from "@/limits/limitWrites";
import type { OwnPolicyCase } from "@/policy-bindings/ownPolicy";
import {
	type OwnPolicyProgress,
	useOwnPolicyWrites,
} from "@/policy-bindings/useOwnPolicyWrites";

export interface LimitSettings {
	target: LimitTarget;
	accountId: string;
	policyCase: OwnPolicyCase;
	displayName: string;
	limit: LimitSpec;
	link: LimitLink;
}

export interface AddedLimit {
	kind: LimitKind;
	limitName: string;
	policyName: string;
	policyCase: SavedPolicyCase;
	target: LimitTarget;
}

interface Progress extends OwnPolicyProgress {
	limitId?: string;
	limitName?: string;
}

/** Sends a limit's writes in order, each reading the ids the earlier ones returned. */
export function useLimitWrites() {
	const createBudget = useCreateBudget();
	const createRateLimit = useCreateRateLimit();
	const runOwnPolicyWrite = useOwnPolicyWrites();

	const settingsRef = useRef<LimitSettings | null>(null);
	const progress = useRef<Progress>({});
	const [added, setAdded] = useState<AddedLimit | null>(null);

	async function runWrite(write: LimitWrite): Promise<void> {
		const settings = required(settingsRef.current ?? undefined, "limit");
		const made = progress.current;
		const { target, limit } = settings;
		const metadata = {
			name: slugWithSuffix(settings.displayName),
			displayName: settings.displayName,
			owner: target.scope,
		};
		switch (write.kind) {
			case "limit": {
				const row =
					limit.kind === "budget"
						? await createBudget.mutateAsync({ metadata, spec: limit.spec })
						: await createRateLimit.mutateAsync({ metadata, spec: limit.spec });
				made.limitId = row.metadata.id;
				made.limitName = row.metadata.name;
				return;
			}
			default: {
				const limitId = required(made.limitId, "limit");
				await runOwnPolicyWrite(
					write,
					made,
					settings.policyCase,
					{
						accountId: settings.accountId,
						owner: target.scope,
						displayName: limitPolicyName(target.label),
					},
					limit.kind === "budget"
						? withBudgetLink(limitId, settings.link.shared)
						: withRateLimitLink(
								limitId,
								settings.link.models,
								settings.link.shared,
							),
				);
				return;
			}
		}
	}

	function addedLimit(): AddedLimit {
		const settings = required(settingsRef.current ?? undefined, "limit");
		const made = progress.current;
		return {
			kind: settings.limit.kind,
			limitName: required(made.limitName, "limit"),
			policyName: required(made.policy?.metadata.name, "policy"),
			policyCase: savedPolicyCase(settings.policyCase),
			target: settings.target,
		};
	}

	const runner = useWriteRunner(runWrite);

	return {
		phase: runner.phase,
		error: runner.error,
		steps: runner.steps,
		doneCount: runner.doneCount,
		added,
		retry: async () => {
			if (await runner.retry()) setAdded(addedLimit());
		},
		reset() {
			setAdded(null);
			runner.reset();
		},
		async start(settings: LimitSettings, writes: readonly LimitWrite[]) {
			settingsRef.current = settings;
			progress.current = {};
			setAdded(null);
			if (await runner.start(writes)) setAdded(addedLimit());
		},
	};
}
