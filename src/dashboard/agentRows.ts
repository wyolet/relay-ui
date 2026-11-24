import type { UsageGroupStat } from "@/api/hooks/usage";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { displayLabel } from "@/lib/displayLabel";
import {
	type ServiceAccountOwner,
	serviceAccountOwner,
	serviceAccountScope,
} from "@/lib/serviceAccountScope";
import type { WorkContextRef } from "@/lib/workContext";

export interface AgentProject {
	id: string;
	teamId: string;
}

/** The usage facts the panel reads from a principal's group. */
export type AgentUsage = Pick<
	UsageGroupStat,
	"key" | "requests" | "cost" | "lastSeen"
>;

export interface AgentRow {
	id: string;
	name: string;
	label: string;
	owner?: ServiceAccountOwner;
	enabled: boolean;
	/** The period's usage; absent when the agent sent nothing. */
	usage?: AgentUsage;
}

/**
 * The service accounts a workspace holds: all for the organization, a team's
 * own and its projects', one project's, and the caller's own in Personal.
 */
export function workspaceAgents(
	serviceAccounts: readonly ServiceAccount[],
	projects: readonly AgentProject[],
	workspace: WorkContextRef,
): ServiceAccount[] {
	if (workspace.kind === "organization") return [...serviceAccounts];
	const teamProjects = new Set(
		projects.filter((p) => p.teamId === workspace.id).map((p) => p.id),
	);
	return serviceAccounts.filter((sa) => {
		const scope = serviceAccountScope(sa);
		if (!scope) return false;
		if (workspace.kind === "team" && scope.kind === "project") {
			return teamProjects.has(scope.id);
		}
		return scope.kind === workspace.kind && scope.id === workspace.id;
	});
}

function spendOf(row: AgentRow): number {
	return row.usage?.cost.usd ?? 0;
}

/** Agents with their period usage, by spend, then requests, then name. */
export function agentRows(
	serviceAccounts: readonly ServiceAccount[],
	usageByPrincipal: readonly AgentUsage[],
): AgentRow[] {
	const usage = new Map(usageByPrincipal.map((g) => [g.key, g]));
	return serviceAccounts
		.flatMap((sa): AgentRow[] => {
			const id = sa.metadata.id;
			if (!id) return [];
			const owner = serviceAccountOwner(sa);
			return [
				{
					id,
					name: sa.metadata.name,
					label: displayLabel(sa.metadata),
					...(owner ? { owner } : {}),
					enabled: sa.spec.enabled ?? true,
					usage: usage.get(id),
				},
			];
		})
		.sort(
			(a, b) =>
				spendOf(b) - spendOf(a) ||
				(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
				a.label.localeCompare(b.label),
		);
}
