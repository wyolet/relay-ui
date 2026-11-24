import { describe, expect, it } from "bun:test";
import {
	type AgentOwnerPick,
	copiedOwnerPick,
	initialOwnerPick,
	type OwnerLimits,
	ownerUnavailable,
	PERSONAL_OFF,
} from "@/agents/agentOwner";
import type { WorkContext } from "@/lib/workContext";

const ALL: OwnerLimits = {
	servedKinds: ["project", "team", "user"],
	personalOff: false,
};
const PROJECTS_ONLY: OwnerLimits = {
	servedKinds: ["project"],
	personalOff: false,
};
const OFF: OwnerLimits = { ...ALL, personalOff: true };

const ctx = (kind: WorkContext["kind"], id: string): WorkContext => ({
	kind,
	id,
	displayName: id,
	admin: true,
});

describe("ownerUnavailable", () => {
	it("offers Team and Personal only where relay takes them", () => {
		expect(ownerUnavailable("team", PROJECTS_ONLY)).toBe(
			"Relay places agents in projects only.",
		);
		expect(ownerUnavailable("personal", PROJECTS_ONLY)).toBe(
			"Relay places agents in projects only.",
		);
		expect(ownerUnavailable("team", ALL)).toBeUndefined();
		expect(ownerUnavailable("personal", ALL)).toBeUndefined();
		expect(
			ownerUnavailable("project", { servedKinds: [], personalOff: true }),
		).toBeUndefined();
	});

	it("says Personal is off while personal accounts are off", () => {
		expect(ownerUnavailable("personal", OFF)).toBe(PERSONAL_OFF);
		expect(ownerUnavailable("team", OFF)).toBeUndefined();
	});
});

describe("initialOwnerPick", () => {
	it("starts on the workspace's project, team or Personal", () => {
		expect(initialOwnerPick(ctx("project", "p1"), ALL)).toEqual({
			ownerKind: "project",
			teamId: "",
			projectId: "p1",
		});
		expect(initialOwnerPick(ctx("team", "t1"), ALL)).toEqual({
			ownerKind: "team",
			teamId: "t1",
			projectId: "",
		});
		expect(initialOwnerPick(ctx("personal", "u1"), ALL)).toEqual({
			ownerKind: "personal",
			teamId: "",
			projectId: "",
		});
	});

	it("starts on Project where the workspace's card is unavailable", () => {
		const project: AgentOwnerPick = {
			ownerKind: "project",
			teamId: "",
			projectId: "",
		};
		expect(initialOwnerPick(ctx("team", "t1"), PROJECTS_ONLY)).toEqual(project);
		expect(initialOwnerPick(ctx("personal", "u1"), OFF)).toEqual(project);
		expect(initialOwnerPick(ctx("organization", ""), ALL)).toEqual(project);
		expect(initialOwnerPick(undefined, ALL)).toEqual(project);
	});
});

describe("copiedOwnerPick", () => {
	it("carries the agent's project, team or Personal over", () => {
		expect(copiedOwnerPick({ kind: "project", id: "p1" }, ALL)).toEqual({
			ownerKind: "project",
			teamId: "",
			projectId: "p1",
		});
		expect(copiedOwnerPick({ kind: "team", id: "t1" }, ALL)).toEqual({
			ownerKind: "team",
			teamId: "t1",
			projectId: "",
		});
		expect(copiedOwnerPick({ kind: "personal", id: "u1" }, ALL)).toEqual({
			ownerKind: "personal",
			teamId: "",
			projectId: "",
		});
	});

	it("starts on an empty Project pick where the kind is unavailable", () => {
		expect(copiedOwnerPick({ kind: "team", id: "t1" }, PROJECTS_ONLY)).toEqual({
			ownerKind: "project",
			teamId: "",
			projectId: "",
		});
		expect(copiedOwnerPick({ kind: "personal", id: "u1" }, OFF)).toEqual({
			ownerKind: "project",
			teamId: "",
			projectId: "",
		});
	});
});
