import { type AccessWrite, accessWrites } from "@/agents/accessWrites";
import type { AgentAccount } from "@/agents/agentAccounts";
import type { AgentSettings } from "@/agents/useAgentWrites";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { agentLabels } from "@/lib/agentLabel";
import { serviceAccountScopeOwner } from "@/lib/serviceAccountScope";

export type AgentAccess = "choose" | "policy";
export type AgentReach = "all" | "accounts";

export interface AgentAnswers {
	displayName: string;
	access: AgentAccess;
	reach: AgentReach;
	/** The picked accounts, in pick order. */
	accounts: readonly AgentAccount[];
	/** The picked keyless-host pools, in pick order; only the one-request path offers them. */
	poolIds: readonly string[];
	models: readonly string[];
	policyId: string;
}

/**
 * What is wrong with the access answers as they will be sent: `accounts` are
 * the picks still offered, and the policy must be among `policyIds`.
 */
export function accessErrors(
	answers: Pick<
		AgentAnswers,
		"access" | "reach" | "accounts" | "poolIds" | "policyId"
	>,
	policyIds: readonly string[],
): { accountIds?: string; policyId?: string } {
	if (answers.access === "policy") {
		return answers.policyId && policyIds.includes(answers.policyId)
			? {}
			: { policyId: "Pick a policy." };
	}
	return answers.reach === "accounts" &&
		answers.accounts.length === 0 &&
		answers.poolIds.length === 0
		? { accountIds: "Pick an account, or use every credential." }
		: {};
}

/** One request the form makes after the last step, in order. */
export type AgentWrite =
	| AccessWrite
	| ({ id: string; label: string } & (
			| { kind: "serviceAccount" }
			| { kind: "laneAccount" }
			| { kind: "policy"; displayName: string; models: string[] }
			| { kind: "bind"; policyId?: string }
			| { kind: "key" }
	  ));

/**
 * The requests that turn the answers into a working agent. A policy is made
 * only when it narrows something: every credential and every model is what an
 * unbound account already reaches.
 */
export function agentWrites(answers: AgentAnswers): AgentWrite[] {
	const name = answers.displayName.trim();
	const start: AgentWrite[] = [
		{
			kind: "serviceAccount",
			id: "service-account",
			label: "Create the service account",
		},
		{
			kind: "laneAccount",
			id: "lane-account",
			label: "Wait for relay to open its account",
		},
	];
	const key: AgentWrite = { kind: "key", id: "key", label: "Issue the key" };
	const bind = (policyId?: string): AgentWrite => ({
		kind: "bind",
		id: "bind",
		label: "Apply the policy to the agent",
		...(policyId ? { policyId } : {}),
	});

	if (answers.access === "policy") {
		return [...start, bind(answers.policyId), key];
	}

	const pooled = answers.reach === "accounts" ? answers.accounts : [];
	const models = [...answers.models];
	if (pooled.length === 0 && models.length === 0) return [...start, key];

	return [
		...start,
		...accessWrites(name, pooled, "the agent's owner"),
		{
			kind: "policy",
			id: "policy",
			label: "Create the policy",
			displayName: `${name} policy`,
			models,
		},
		bind(),
		key,
	];
}

/** The chain's `POST /service-accounts` body: the owner named, a project restated in the spec. */
export function agentServiceAccountBody(
	settings: Pick<
		AgentSettings,
		"name" | "displayName" | "description" | "scope"
	>,
): ServiceAccount {
	const { scope } = settings;
	return {
		metadata: {
			name: settings.name,
			displayName: settings.displayName,
			description: settings.description,
			labels: agentLabels(),
			owner: serviceAccountScopeOwner(scope),
		},
		spec: {
			...(scope.kind === "project" ? { projectId: scope.id } : {}),
			enabled: true,
		},
	};
}
