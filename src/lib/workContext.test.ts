import { describe, expect, test } from "bun:test";
import type { components } from "@/api/types.gen";
import {
	contextLabel,
	contextOwner,
	contextPlacement,
	contextRows,
	contextTeamId,
	contextUsableBy,
	ownerPlacement,
	ownerUsableBy,
	resolveWorkContext,
	SYSTEM_CONTEXT,
	scopeOptions,
	type WorkContext,
	workContexts,
} from "@/lib/workContext";

type MyContext = components["schemas"]["MyContext"];

const mine: MyContext[] = [
	{
		kind: "personal",
		id: "u1",
		name: "ana",
		displayName: "ana",
		admin: true,
	},
	{
		kind: "team",
		id: "t1",
		name: "platform",
		displayName: "Platform",
		admin: true,
	},
	{
		kind: "project",
		id: "p1",
		name: "search",
		displayName: "Search",
		teamId: "t1",
		admin: false,
	},
	{
		kind: "project",
		id: "p2",
		name: "ml",
		displayName: "ML",
		teamId: "t9",
		admin: false,
	},
];

const personal: WorkContext = {
	kind: "personal",
	id: "u1",
	displayName: "ana",
};
const team: WorkContext = { kind: "team", id: "t1", displayName: "Platform" };
const project: WorkContext = {
	kind: "project",
	id: "p1",
	displayName: "Search",
	teamId: "t1",
};

describe("workContexts", () => {
	test("keeps server order for a non-admin", () => {
		expect(workContexts(mine, false).map((c) => c.id)).toEqual([
			"u1",
			"t1",
			"p1",
			"p2",
		]);
	});

	test("puts System after personal for an admin", () => {
		expect(workContexts(mine, true).map((c) => c.kind)).toEqual([
			"personal",
			"system",
			"team",
			"project",
			"project",
		]);
	});

	test("starts on System for the admin token, which has no personal scope", () => {
		expect(workContexts(mine.slice(1), true)[0]).toEqual(SYSTEM_CONTEXT);
	});
});

describe("resolveWorkContext", () => {
	const contexts = workContexts(mine, false);

	test("keeps the stored context while it is listed", () => {
		expect(resolveWorkContext(contexts, { kind: "team", id: "t1" })?.id).toBe(
			"t1",
		);
	});

	test("falls back to the first context when the stored one is gone", () => {
		expect(
			resolveWorkContext(contexts, { kind: "team", id: "gone" })?.kind,
		).toBe("personal");
		expect(resolveWorkContext(contexts, null)?.kind).toBe("personal");
	});

	test("is undefined with no contexts", () => {
		expect(resolveWorkContext([], null)).toBeUndefined();
	});
});

describe("contextOwner", () => {
	test("personal sends no owner", () => {
		expect(contextOwner(personal)).toBeUndefined();
	});

	test("System, teams and projects send themselves", () => {
		expect(contextOwner(SYSTEM_CONTEXT)).toEqual({ kind: "system" });
		expect(contextOwner(team)).toEqual({ kind: "team", id: "t1" });
		expect(contextOwner(project)).toEqual({ kind: "project", id: "p1" });
	});
});

describe("contextUsableBy", () => {
	test("names the scope the way the list filter takes it", () => {
		expect(contextUsableBy(personal)).toBe("user:u1");
		expect(contextUsableBy(SYSTEM_CONTEXT)).toBe("system");
		expect(contextUsableBy(team)).toBe("team:t1");
		expect(contextUsableBy(project)).toBe("project:p1");
	});
});

describe("ownerUsableBy", () => {
	test("a user owner without id is the caller", () => {
		expect(ownerUsableBy({ kind: "user" }, "u1")).toBe("user:u1");
		expect(ownerUsableBy(undefined, "u1")).toBe("user:u1");
		expect(ownerUsableBy({ kind: "user", id: "u2" }, "u1")).toBe("user:u2");
	});

	test("tenancy owners and System map to the filter", () => {
		expect(ownerUsableBy({ kind: "team", id: "t1" }, "u1")).toBe("team:t1");
		expect(ownerUsableBy({ kind: "system" }, "u1")).toBe("system");
	});

	test("owners the filter can't name send none", () => {
		expect(ownerUsableBy({ kind: "provider", id: "x" }, "u1")).toBeUndefined();
		expect(ownerUsableBy({ kind: "team" }, "u1")).toBeUndefined();
		expect(ownerUsableBy({ kind: "user" }, undefined)).toBeUndefined();
	});
});

describe("placement", () => {
	const contexts = workContexts(mine, false);

	test("names the context a create lands in", () => {
		expect(contextPlacement(personal)).toBe("In Personal");
		expect(contextPlacement(SYSTEM_CONTEXT)).toBe("In System");
		expect(contextPlacement(team)).toBe("In Team Platform");
		expect(contextPlacement(project)).toBe("In Project Search");
	});

	test("names a row's owner from the caller's contexts", () => {
		expect(ownerPlacement({ kind: "team", id: "t1" }, contexts, "u1")).toBe(
			"In Team Platform",
		);
		expect(ownerPlacement({ kind: "user", id: "u1" }, contexts, "u1")).toBe(
			"In Personal",
		);
		expect(ownerPlacement({ kind: "system" }, contexts, "u1")).toBe(
			"In System",
		);
	});

	test("falls back to a short id outside the caller's contexts", () => {
		expect(
			ownerPlacement({ kind: "project", id: "0123456789" }, contexts, "u1"),
		).toBe("In Project 01234567…");
		expect(ownerPlacement({ kind: "user", id: "u2" }, contexts, "u1")).toBe(
			"In user u2…",
		);
	});
});

describe("contextRows", () => {
	test("nests projects under their team; orphans follow unnested", () => {
		const rows = contextRows(workContexts(mine, true));
		expect(rows.map((r) => [r.context.kind, r.context.id, r.nested])).toEqual([
			["personal", "u1", false],
			["system", "", false],
			["team", "t1", false],
			["project", "p1", true],
			["project", "p2", false],
		]);
	});
});

describe("contextLabel", () => {
	test("personal reads as Personal, the rest by display name", () => {
		expect(contextLabel(personal)).toBe("Personal");
		expect(contextLabel(team)).toBe("Platform");
	});
});

describe("scopeOptions", () => {
	test("lists one kind by id and display name", () => {
		const contexts = workContexts(mine, true);
		expect(scopeOptions(contexts, "team")).toEqual([
			{ value: "t1", kind: "team", label: "Platform" },
		]);
		expect(scopeOptions(contexts, "project").map((o) => o.value)).toEqual([
			"p1",
			"p2",
		]);
	});
});

describe("contextTeamId", () => {
	test("is the team, or the project's team", () => {
		expect(contextTeamId(team)).toBe("t1");
		expect(contextTeamId(project)).toBe("t1");
		expect(contextTeamId(personal)).toBeUndefined();
		expect(contextTeamId(SYSTEM_CONTEXT)).toBeUndefined();
	});
});
