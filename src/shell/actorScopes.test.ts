import { describe, expect, test } from "bun:test";
import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";
import { scopeLabels } from "@/shell/actorScopes";

const team = {
	metadata: { id: "t1", name: "acme", displayName: "Acme" },
	spec: {},
} as Team;

const project = {
	metadata: { id: "p1", name: "web" },
	spec: { teamId: "t1" },
} as Project;

describe("scopeLabels", () => {
	test("names team and project scopes", () => {
		expect(scopeLabels(["team:t1", "project:p1"], [team], [project])).toEqual([
			{ scope: "team:t1", kind: "Team", name: "Acme" },
			{ scope: "project:p1", kind: "Project", name: "web" },
		]);
	});

	test("falls back to the id when the kind is not listable", () => {
		expect(scopeLabels(["team:t9"], [], [])).toEqual([
			{ scope: "team:t9", kind: "Team", name: "t9" },
		]);
	});

	test("passes an unknown scope shape through", () => {
		expect(scopeLabels(["system"], [], [])).toEqual([
			{ scope: "system", kind: "system", name: "" },
		]);
	});
});
