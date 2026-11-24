import type { RepresentedPool } from "@/access/accessOptions";
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
	/** Picked pools at keyless hosts; only the one-request path offers them. */
	poolIds?: readonly string[];
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
		answers.keptPoolIds.length === 0 &&
		(answers.poolIds ?? []).length === 0
		? { accountIds: "Pick an account, or use every credential." }
		: {};
}

/** Whether the answers narrow what an account under no policy reaches. */
function narrows(answers: AccessAnswers): boolean {
	return !answers.everyCredential || answers.models.length > 0;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** One picked host's pool once saved: `poolId` names the current pool kept for it, unset means a new one. */
export interface PoolLink {
	hostId: string;
	poolId?: string;
}

/**
 * A pool per host of the picks, hosts in the order they first appear: the
 * current pool listing exactly that host's picks, in order, else a new one.
 */
export function poolLinks(
	answers: AccessAnswers,
	represented: readonly RepresentedPool[],
): PoolLink[] {
	if (answers.everyCredential) return [];
	const byHost = new Map<string, string[]>();
	for (const a of answers.accounts) {
		byHost.set(a.hostId, [...(byHost.get(a.hostId) ?? []), a.id]);
	}
	return [...byHost].map(([hostId, ids]) => {
		const same = represented.find(
			(p) => p.hostId === hostId && sameIds(p.accountIds, ids),
		);
		return same ? { hostId, poolId: same.id } : { hostId };
	});
}

/** The policy's pools once saved: kept pools, then each host's current or newly made pool. */
export function linkedPoolIds(
	keptPoolIds: readonly string[],
	links: readonly PoolLink[],
	madePoolIds: readonly string[],
): string[] {
	const ids = [...keptPoolIds];
	let made = 0;
	for (const link of links) {
		const id = link.poolId ?? madePoolIds[made++];
		if (id) ids.push(id);
	}
	return ids;
}

/**
 * The requests that give the target its access: shares and new pools for the
 * hosts no current pool stands for, then the policy step for its case. None
 * when a policy is set above the caller, when a target under no policy would
 * reach what it does, or when its own policy would stay as it is.
 */
export function accessPlan(
	answers: AccessAnswers,
	policyCase: OwnPolicyCase,
	names: AccessNames,
	represented: readonly RepresentedPool[],
): AccessPlanWrite[] {
	if (policyCase.kind === "above") return [];
	if (policyCase.kind === "create" && !narrows(answers)) return [];
	const links = poolLinks(answers, represented);
	const newHosts = new Set(links.flatMap((l) => (l.poolId ? [] : l.hostId)));
	if (
		policyCase.kind === "update" &&
		newHosts.size === 0 &&
		sameIds(
			policyCase.policy.spec.poolIds ?? [],
			linkedPoolIds(sentKeptPoolIds(answers), links, []),
		) &&
		sameIds(policyCase.policy.spec.models ?? [], answers.models)
	) {
		return [];
	}
	const pooled = answers.accounts.filter((a) => newHosts.has(a.hostId));
	return [
		...accessWrites(names.target, pooled, names.scope),
		...ownPolicyWrites(policyCase, names.target),
	];
}

/** Why a plan has no writes, for the disabled Save. */
export function noWritesLine(
	policyCase: Pick<OwnPolicyCase, "kind">,
	target: string,
): string {
	return policyCase.kind === "create"
		? `This is what ${target} reaches already.`
		: "Nothing changed.";
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
	represented: readonly RepresentedPool[],
): string[] {
	if (policyCase.kind !== "update" && policyCase.kind !== "copy") return [];
	const kept = new Set(
		linkedPoolIds(
			sentKeptPoolIds(answers),
			poolLinks(answers, represented),
			[],
		),
	);
	return (policyCase.policy.spec.poolIds ?? []).filter((id) => !kept.has(id));
}

export const POLICY_SET_ABOVE_LINE =
	"Limited by a policy you can't see or change. Ask whoever set it.";

/** One line on what the target is under now and what a save does to it. */
export function currentPolicyLine(
	policyCase: OwnPolicyCase,
	target: string,
): string {
	switch (policyCase.kind) {
		case "create":
			return "No policy yet";
		case "above":
			return POLICY_SET_ABOVE_LINE;
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
