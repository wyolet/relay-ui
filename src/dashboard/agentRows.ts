import type { UsageGroupStat } from "@/api/hooks/usage";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { displayLabel } from "@/lib/displayLabel";
import type { WorkContextRef } from "@/lib/workContext";

export interface AgentProject {
	id: string;
	label: string;
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
	project: string;
	enabled: boolean;
	/** The period's usage; absent when the agent sent nothing. */
	usage?: AgentUsage;
}

/** The service accounts a workspace holds: all for the organization, a team's projects', one project's; a personal workspace holds none. */
export function workspaceAgents(
	serviceAccounts: readonly ServiceAccount[],
	projects: readonly AgentProject[],
	workspace: WorkContextRef,
): ServiceAccount[] {
	if (workspace.kind === "organization") return [...serviceAccounts];
	if (workspace.kind === "personal") return [];
	const projectIds = new Set(
		workspace.kind === "project"
			? [workspace.id]
			: projects.filter((p) => p.teamId === workspace.id).map((p) => p.id),
	);
	return serviceAccounts.filter((sa) => projectIds.has(sa.spec.projectId));
}

function spendOf(row: AgentRow): number {
	return row.usage?.cost.usd ?? 0;
}

/** Agents with their period usage, by spend, then requests, then name. */
export function agentRows(
	serviceAccounts: readonly ServiceAccount[],
	projects: readonly AgentProject[],
	usageByPrincipal: readonly AgentUsage[],
): AgentRow[] {
	const usage = new Map(usageByPrincipal.map((g) => [g.key, g]));
	const projectLabel = new Map(projects.map((p) => [p.id, p.label]));
	return serviceAccounts
		.flatMap((sa): AgentRow[] => {
			const id = sa.metadata.id;
			if (!id) return [];
			return [
				{
					id,
					name: sa.metadata.name,
					label: displayLabel(sa.metadata),
					project: projectLabel.get(sa.spec.projectId) ?? "",
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
