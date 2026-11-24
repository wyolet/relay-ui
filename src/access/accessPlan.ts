import { type AccessWrite, accessWrites } from "@/agents/accessWrites";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { PolicySpec } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";
import {
	type OwnPolicyCase,
	type OwnPolicyWrite,
	ownPolicyWrites,
} from "@/policy-bindings/ownPolicy";

/** The whole access a target is given. */
export interface AccessAnswers {
	everyCredential: boolean;
	/** The picked accounts still offered, in pick order. */
	accounts: readonly AgentAccount[];
	/** The current policy's pools linked as they are, in their current order. */
	keptPoolIds: readonly string[];
	models: readonly string[];
}

/** How the plan names the rows: the target, and the scope a share goes to. */
export interface AccessNames {
	target: string;
	scope: string;
}

export type AccessPlanWrite = AccessWrite | OwnPolicyWrite;

/** The pools linked as they are once saved; every credential links none. */
export function sentKeptPoolIds(answers: AccessAnswers): readonly string[] {
	return answers.everyCredential ? [] : answers.keptPoolIds;
}

/** What is wrong with the answers as they will be sent. */
export function accessErrors(answers: AccessAnswers): { accountIds?: string } {
	return !answers.everyCredential &&
		answers.accounts.length === 0 &&
		answers.keptPoolIds.length === 0
		? { accountIds: "Pick an account, or use every credential." }
		: {};
}

/** Whether the answers narrow what an account under no policy reaches. */
function narrows(answers: AccessAnswers): boolean {
	return !answers.everyCredential || answers.models.length > 0;
}

/**
 * The requests that give the target its access: shares and fresh pools for the
 * picked accounts, then the policy step for its case. None when a policy is set
 * above the caller, or when a target under no policy would reach what it does.
 */
export function accessPlan(
	answers: AccessAnswers,
	policyCase: OwnPolicyCase,
	names: AccessNames,
): AccessPlanWrite[] {
	if (policyCase.kind === "above") return [];
	if (policyCase.kind === "create" && !narrows(answers)) return [];
	const pooled = answers.everyCredential ? [] : answers.accounts;
	return [
		...accessWrites(names.target, pooled, names.scope),
		...ownPolicyWrites(policyCase, names.target),
	];
}

/** The policy's spec with its pools and models replaced; limits, budgets and `enabled` stay. */
export function accessSpec(
	spec: PolicySpec,
	poolIds: readonly string[],
	models: readonly string[],
): PolicySpec {
	return {
		...spec,
		poolIds: poolIds.length > 0 ? [...poolIds] : null,
		models: [...models],
	};
}

/** The current policy's pools the save no longer links. */
export function unlinkedPoolIds(
	policyCase: OwnPolicyCase,
	answers: AccessAnswers,
): string[] {
	if (policyCase.kind !== "update" && policyCase.kind !== "copy") return [];
	const kept = new Set(sentKeptPoolIds(answers));
	return (policyCase.policy.spec.poolIds ?? []).filter((id) => !kept.has(id));
}

/** One line on what the target is under now and what a save does to it. */
export function currentPolicyLine(
	policyCase: OwnPolicyCase,
	target: string,
): string {
	switch (policyCase.kind) {
		case "create":
			return "No policy yet";
		case "above":
			return "Limited by a policy you can't see or change. Ask whoever set it.";
		case "update":
			return `Policy ${displayLabel(policyCase.policy.metadata)}`;
		case "copy": {
			const name = displayLabel(policyCase.policy.metadata);
			const copy = `saving makes a copy for ${target}`;
			const n = policyCase.otherAccounts;
			if (n > 0) {
				return `Policy ${name}, shared with ${n} other ${n === 1 ? "account" : "accounts"}: ${copy}`;
			}
			return policyCase.policy.metadata.owner?.kind === "host"
				? `Policy ${name}, a preset: ${copy}`
				: `Policy ${name}, owned by another scope: ${copy}`;
		}
	}
}
