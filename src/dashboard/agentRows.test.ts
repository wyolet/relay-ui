import { describe, expect, it } from "bun:test";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import {
	type AgentUsage,
	agentRows,
	workspaceAgents,
} from "@/dashboard/agentRows";

const sa = (id: string, projectId: string): ServiceAccount => ({
	metadata: { id, name: id, displayName: id.toUpperCase() },
	spec: { projectId, enabled: true },
});

const projects = [
	{ id: "p1", label: "Search", teamId: "t1" },
	{ id: "p2", label: "Billing", teamId: "t2" },
];
const all = [sa("a", "p1"), sa("b", "p2"), sa("c", "p1")];

describe("workspaceAgents", () => {
	it("narrows to the workspace's projects", () => {
		const ids = (
			kind: "organization" | "team" | "project" | "personal",
			id: string,
		) => workspaceAgents(all, projects, { kind, id }).map((s) => s.metadata.id);
		expect(ids("organization", "")).toEqual(["a", "b", "c"]);
		expect(ids("team", "t1")).toEqual(["a", "c"]);
		expect(ids("project", "p2")).toEqual(["b"]);
		expect(ids("personal", "me")).toEqual([]);
	});
});

describe("agentRows", () => {
	it("ranks by spend, then requests, then name, and names the project", () => {
		const usage: AgentUsage[] = [
			{
				key: "c",
				requests: 5,
				cost: { usd: 2, unpricedEvents: 0, unpricedShare: 0 },
				lastSeen: "",
			},
			{
				key: "b",
				requests: 9,
				cost: { usd: null, unpricedEvents: 9, unpricedShare: 1 },
				lastSeen: "",
			},
		];
		const rows = agentRows(all, projects, usage);
		expect(rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
		expect(rows[0]).toMatchObject({ label: "C", project: "Search" });
		expect(rows[2]?.usage).toBeUndefined();
	});
});
