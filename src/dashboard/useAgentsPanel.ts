import { useProjects } from "@/api/hooks/projects";
import { useServiceAccountsList } from "@/api/hooks/serviceAccounts";
import { useUsageOverviewWithDeltas } from "@/api/hooks/usage";
import { useWorkContext } from "@/hooks/useWorkContext";
import { AGENT_LABEL_SELECTOR } from "@/lib/agentLabel";
import { displayLabel } from "@/lib/displayLabel";
import { fmtCompact, fmtMoneyCompact } from "@/usage/format";
import { agentRows, workspaceAgents } from "./agentRows";
import { useDashboardWindow } from "./useDashboardWindow";

const LIMIT = 6;
const AGENTS = { label: [AGENT_LABEL_SELECTOR] };

export interface AgentPanelRow {
	id: string;
	name: string;
	label: string;
	project: string;
	enabled: boolean;
	lastRequestAt?: string;
	requests: string;
	spend: string;
}

/** The workspace's agents with the period's usage, top spenders first. */
export function useAgentsPanel(): {
	rows: AgentPanelRow[];
	more: number;
	period: string;
} {
	const { ref } = useWorkContext();
	const { win, filter, period } = useDashboardWindow();
	const { data: serviceAccounts } = useServiceAccountsList(AGENTS);
	const { data: projects } = useProjects();
	const { groups } = useUsageOverviewWithDeltas("principal_id", win, filter);

	const agentProjects = (projects.items ?? []).flatMap((p) =>
		p.metadata.id
			? [
					{
						id: p.metadata.id,
						label: displayLabel(p.metadata),
						teamId: p.spec.teamId,
					},
				]
			: [],
	);
	const rows = agentRows(
		workspaceAgents(serviceAccounts.items ?? [], agentProjects, ref),
		agentProjects,
		groups,
	);
	return {
		rows: rows.slice(0, LIMIT).map((r) => ({
			id: r.id,
			name: r.name,
			label: r.label,
			project: r.project,
			enabled: r.enabled,
			lastRequestAt: r.usage?.lastSeen || undefined,
			requests: r.usage ? fmtCompact(r.usage.requests) : "—",
			spend:
				r.usage?.cost.usd != null
					? fmtMoneyCompact(r.usage.cost.usd, "USD")
					: "—",
		})),
		more: Math.max(rows.length - LIMIT, 0),
		period,
	};
}
