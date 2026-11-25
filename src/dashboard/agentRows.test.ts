import { describe, expect, it } from "bun:test";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import {
	type AgentUsage,
	agentRows,
	workspaceAgents,
} from "@/dashboard/agentRows";

const sa = (
	id: string,
	kind: "project" | "team" | "user",
	ownerId: string,
): ServiceAccount => ({
	metadata: {
		id,
		name: id,
		displayName: id.toUpperCase(),
		owner: { kind, id: ownerId },
	},
	spec: {
		...(kind === "project" ? { projectId: ownerId } : {}),
		enabled: true,
	},
});

const projects = [
	{ id: "p1", teamId: "t1" },
	{ id: "p2", teamId: "t2" },
];
const all = [
	sa("a", "project", "p1"),
	sa("b", "project", "p2"),
	sa("c", "project", "p1"),
	sa("d", "team", "t1"),
	sa("e", "user", "me"),
	sa("f", "user", "other"),
];

describe("workspaceAgents", () => {
	const ids = (
		kind: "organization" | "team" | "project" | "personal",
		id: string,
	) => workspaceAgents(all, projects, { kind, id }).map((s) => s.metadata.id);

	it("holds every agent in the organization", () => {
		expect(ids("organization", "")).toEqual(["a", "b", "c", "d", "e", "f"]);
	});

	it("holds a team's own agents and its projects'", () => {
		expect(ids("team", "t1")).toEqual(["a", "c", "d"]);
		expect(ids("team", "t2")).toEqual(["b"]);
	});

	it("holds a project's own agents", () => {
		expect(ids("project", "p2")).toEqual(["b"]);
	});

	it("holds the caller's own agents in Personal", () => {
		expect(ids("personal", "me")).toEqual(["e"]);
	});
});

describe("agentRows", () => {
	it("ranks by spend, then requests, then name, and names the owner", () => {
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
		const rows = agentRows(all.slice(0, 3), usage);
		expect(rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
		expect(rows[0]).toMatchObject({
			label: "C",
			owner: { kind: "project", id: "p1" },
		});
		expect(rows[2]?.usage).toBeUndefined();
	});

	it("names a user owner", () => {
		const personal = all.filter((s) => s.metadata.id === "e");
		expect(agentRows(personal, [])[0]?.owner).toEqual({
			kind: "user",
			id: "me",
		});
	});
});
