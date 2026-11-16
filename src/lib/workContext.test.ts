import { describe, expect, test } from "bun:test";
import type { components } from "@/api/types.gen";
import {
	contextInitials,
	contextLabel,
	contextName,
	contextOwner,
	contextRowDetail,
	contextRows,
	contextSubtitle,
	contextTeamId,
	contextTitle,
	contextUsableBy,
	contextUsageScope,
	createContext,
	notAvailableLabel,
	ORGANIZATION_CONTEXT,
	ownerName,
	ownerUsableBy,
	resolveWorkContext,
	scopeOptions,
	unavailablePicks,
	unavailablePicksError,
	unusablePicks,
	updatingScope,
	type WorkContext,
	workContexts,
	workspaceKeys,
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
	admin: true,
};
const team: WorkContext = {
	kind: "team",
	id: "t1",
	displayName: "Platform",
	admin: true,
};
const project: WorkContext = {
	kind: "project",
	id: "p1",
	displayName: "Search",
	teamId: "t1",
	admin: false,
};

// An admin's list as relay sends it: the organization first.
const adminMine: MyContext[] = [
	{
		kind: "organization",
		id: "",
		name: "organization",
		displayName: "Organization",
		admin: true,
	},
	...mine,
];

describe("workContexts", () => {
	test("keeps server order", () => {
		expect(workContexts(mine).map((c) => c.id)).toEqual([
			"u1",
			"t1",
			"p1",
			"p2",
		]);
		expect(workContexts(adminMine)[0]).toEqual(ORGANIZATION_CONTEXT);
	});
});

describe("resolveWorkContext", () => {
	const contexts = workContexts(mine);

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

	test("a stored Personal that /me/contexts dropped falls back to the next context", () => {
		const withoutPersonal = workContexts(mine.slice(1));
		expect(
			resolveWorkContext(withoutPersonal, { kind: "personal", id: "u1" })?.id,
		).toBe("t1");
	});

	test("is undefined with no contexts", () => {
		expect(resolveWorkContext([], null)).toBeUndefined();
	});
});

describe("contextOwner", () => {
	test("personal sends no owner", () => {
		expect(contextOwner(personal)).toBeUndefined();
	});

	test("the organization, teams and projects send themselves", () => {
		expect(contextOwner(ORGANIZATION_CONTEXT)).toEqual({
			kind: "organization",
		});
		expect(contextOwner(team)).toEqual({ kind: "team", id: "t1" });
		expect(contextOwner(project)).toEqual({ kind: "project", id: "p1" });
	});
});

describe("contextUsableBy", () => {
	test("names the scope the way the list filter takes it", () => {
		expect(contextUsableBy(personal)).toBe("user:u1");
		expect(contextUsableBy(ORGANIZATION_CONTEXT)).toBe("organization");
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

	test("tenancy owners, the organization and System map to the filter", () => {
		expect(ownerUsableBy({ kind: "team", id: "t1" }, "u1")).toBe("team:t1");
		expect(ownerUsableBy({ kind: "system" }, "u1")).toBe("system");
		expect(ownerUsableBy({ kind: "organization" }, "u1")).toBe("organization");
	});

	test("owners the filter can't name send none", () => {
		expect(ownerUsableBy({ kind: "provider", id: "x" }, "u1")).toBeUndefined();
		expect(ownerUsableBy({ kind: "team" }, "u1")).toBeUndefined();
		expect(ownerUsableBy({ kind: "user" }, undefined)).toBeUndefined();
	});
});

describe("placement", () => {
	const contexts = workContexts(mine);

	test("names the context a create lands in", () => {
		expect(contextName(personal)).toBe("Personal");
		expect(contextName(ORGANIZATION_CONTEXT)).toBe("Organization");
		expect(contextName(team)).toBe("Team Platform");
		expect(contextName(project)).toBe("Project Search");
	});

	test("names a row's owner from the caller's contexts", () => {
		expect(ownerName({ kind: "team", id: "t1" }, contexts, "u1")).toBe(
			"Team Platform",
		);
		expect(ownerName({ kind: "user", id: "u1" }, contexts, "u1")).toBe(
			"Personal",
		);
		expect(ownerName({ kind: "system" }, contexts, "u1")).toBe("System");
		expect(ownerName({ kind: "organization" }, contexts, "u1")).toBe(
			"Organization",
		);
	});

	test("falls back to a short id outside the caller's contexts", () => {
		expect(
			ownerName({ kind: "project", id: "0123456789" }, contexts, "u1"),
		).toBe("Project 01234567…");
		expect(ownerName({ kind: "user", id: "u2" }, contexts, "u1")).toBe(
			"user u2…",
		);
	});
});

describe("switcher trigger", () => {
	test("personal shows whose it is; the rest by display name", () => {
		expect(contextTitle(personal)).toBe("ana");
		expect(contextTitle({ ...personal, displayName: "" })).toBe("Personal");
		expect(contextTitle(team)).toBe("Platform");
	});

	test("the subtitle is your role in a team or project, else its span", () => {
		expect(contextSubtitle(team)).toBe("Team admin");
		expect(contextSubtitle(project)).toBe("Project member");
		expect(contextSubtitle(personal)).toBe("Personal");
		expect(contextSubtitle(ORGANIZATION_CONTEXT)).toBe("All teams");
	});

	test("a row names whose your personal space is", () => {
		expect(contextRowDetail(personal)).toBe("ana");
		expect(contextRowDetail(team)).toBe("Team admin");
	});

	test("initials take two words' first letters, else the name's first two", () => {
		expect(contextInitials({ ...team, displayName: "Wyolet Relay" })).toBe(
			"WR",
		);
		expect(contextInitials(team)).toBe("PL");
		expect(contextInitials({ ...team, displayName: "ml-ops" })).toBe("MO");
	});
});

describe("unusablePicks", () => {
	test("returns the picks the rows lack, in pick order", () => {
		const rows = [{ metadata: { id: "a" } }, { metadata: { id: "b" } }];
		expect(unusablePicks(["y", "b", "x", "a"], rows)).toEqual(["y", "x"]);
	});

	test("an id-less row allows nothing", () => {
		expect(unusablePicks(["a"], [{ metadata: {} }])).toEqual(["a"]);
	});

	test("everything is unusable when nothing is listed", () => {
		expect(unusablePicks(["a"], [])).toEqual(["a"]);
	});
});

describe("unavailablePicks", () => {
	const rows = [{ metadata: { id: "a" } }];
	const current = { items: rows, loaded: true, fromPreviousScope: false };
	const create = { scope: "Team Platform", editable: true };

	test("flags a create's picks its scope's list lacks", () => {
		expect(unavailablePicks(["a", "b"], current, create)).toEqual({
			ids: ["b"],
			scope: "Team Platform",
		});
	});

	test("flags nothing when every pick is usable", () => {
		expect(unavailablePicks(["a"], current, create)).toBeUndefined();
	});

	test("waits for the current scope's rows", () => {
		expect(
			unavailablePicks(["b"], { ...current, fromPreviousScope: true }, create),
		).toBeUndefined();
		expect(
			unavailablePicks(
				["b"],
				{ items: [], loaded: false, fromPreviousScope: false },
				create,
			),
		).toBeUndefined();
	});

	test("never flags an edit's picks", () => {
		expect(
			unavailablePicks(["b"], current, { scope: "Personal", editable: false }),
		).toBeUndefined();
		expect(unavailablePicks(["b"], current, undefined)).toBeUndefined();
	});
});

describe("updatingScope", () => {
	const create = { scope: "Team Platform", editable: true };
	const fresh = { fromPreviousScope: false };
	const stale = { fromPreviousScope: true };

	test("names the scope while any list shows the last scope's rows", () => {
		expect(updatingScope(create, fresh, stale)).toBe("Team Platform");
		expect(updatingScope(create, fresh, fresh)).toBeUndefined();
		expect(updatingScope(undefined, stale)).toBeUndefined();
	});
});

describe("unavailable pick copy", () => {
	const flagged = { ids: ["b"], scope: "Team Platform" };

	test("marks a pick with the scope", () => {
		expect(notAvailableLabel("Team Platform")).toBe(
			"Not available in Team Platform",
		);
	});

	test("errors only once a save was tried", () => {
		expect(unavailablePicksError(flagged, false)).toBeUndefined();
		expect(unavailablePicksError(undefined, true)).toBeUndefined();
		expect(unavailablePicksError(flagged, true)).toBe(
			"Remove what Team Platform can't use, or switch the workspace back.",
		);
	});
});

describe("contextRows", () => {
	test("nests projects under their team; orphans follow unnested", () => {
		const rows = contextRows(workContexts(adminMine));
		expect(rows.map((r) => [r.context.kind, r.context.id, r.nested])).toEqual([
			["organization", "", false],
			["personal", "u1", false],
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
		const contexts = workContexts(adminMine);
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
		expect(contextTeamId(ORGANIZATION_CONTEXT)).toBeUndefined();
	});
});

describe("resolveWorkContext with a stored project", () => {
	test("resolves to its team when the team is listed", () => {
		const contexts = workContexts(mine);
		expect(
			resolveWorkContext(contexts, { kind: "project", id: "p1" })?.id,
		).toBe("t1");
	});
	test("stays the project when its team isn't listed", () => {
		const contexts = workContexts(mine);
		expect(
			resolveWorkContext(contexts, { kind: "project", id: "p2" })?.id,
		).toBe("p2");
	});
});

describe("contextUsageScope", () => {
	test("narrows usage to the workspace", () => {
		expect(contextUsageScope(personal)).toEqual({ principal_id: ["u1"] });
		expect(contextUsageScope(team)).toEqual({ team_id: ["t1"] });
		expect(contextUsageScope(project)).toEqual({ project_id: ["p1"] });
		expect(contextUsageScope(ORGANIZATION_CONTEXT)).toEqual({});
	});
});

describe("workspaceKeys", () => {
	test("a team brings its listed projects", () => {
		const contexts = workContexts(mine);
		expect(workspaceKeys(team, contexts)).toEqual(["team:t1", "project:p1"]);
		expect(workspaceKeys(personal, contexts)).toEqual(["personal:u1"]);
		expect(workspaceKeys(ORGANIZATION_CONTEXT, contexts)).toEqual([]);
	});
});

describe("createContext", () => {
	const admin = workContexts(adminMine);
	test("the organization creates in itself when it may own the kind", () => {
		expect(createContext(ORGANIZATION_CONTEXT, admin, true)).toBe(
			ORGANIZATION_CONTEXT,
		);
	});
	test("a kind it can't own goes to Personal", () => {
		expect(createContext(ORGANIZATION_CONTEXT, admin, false)?.kind).toBe(
			"personal",
		);
	});
	test("without a personal account, to the first team", () => {
		const noPersonal = admin.filter((c) => c.kind !== "personal");
		expect(createContext(ORGANIZATION_CONTEXT, noPersonal, false)?.id).toBe(
			"t1",
		);
	});
	test("any other workspace creates in itself", () => {
		expect(createContext(team, admin, false)).toBe(team);
	});
});
