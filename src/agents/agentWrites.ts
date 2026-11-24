import { type AccessWrite, accessWrites } from "@/agents/accessWrites";
import type { AgentAccount } from "@/agents/agentAccounts";

export type AgentAccess = "choose" | "policy";
export type AgentReach = "all" | "accounts";

export interface AgentAnswers {
	displayName: string;
	access: AgentAccess;
	reach: AgentReach;
	/** The picked accounts, in pick order. */
	accounts: readonly AgentAccount[];
	models: readonly string[];
	policyId: string;
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
