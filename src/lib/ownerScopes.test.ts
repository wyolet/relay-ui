import { describe, expect, test } from "bun:test";
import type { Project } from "@/api/types/project";
import type { Team } from "@/api/types/team";
import {
	ALL_OWNER_SCOPES,
	defaultOwnerKey,
	ownerFromKey,
	ownerKey,
	ownerKeyId,
	ownerOptions,
} from "@/lib/ownerScopes";

const team = {
	metadata: { id: "t1", name: "acme", displayName: "Acme" },
	spec: {},
} as Team;

const projects = [
	{ metadata: { id: "p1", name: "web" }, spec: { teamId: "t1" } },
	{
		metadata: { id: "p2", name: "ml", displayName: "ML" },
		spec: { teamId: "t1" },
	},
] as Project[];

describe("ownerKey", () => {
	test("collapses the caller's own user owner to personal", () => {
		expect(ownerKey({ kind: "user", id: "u1" }, "u1")).toBe("user");
		expect(ownerKey({ kind: "user" }, "u1")).toBe("user");
	});

	test("keeps another user's id", () => {
		expect(ownerKey({ kind: "user", id: "u2" }, "u1")).toBe("user:u2");
	});

	test("spells scoped and id-less owners", () => {
		expect(ownerKey({ kind: "project", id: "p1" }, "u1")).toBe("project:p1");
		expect(ownerKey({ kind: "system" }, "u1")).toBe("system");
		expect(ownerKey(undefined, "u1")).toBe("");
	});
});

describe("ownerFromKey", () => {
	test("personal names the caller only when given", () => {
		expect(ownerFromKey("user")).toEqual({ kind: "user" });
		expect(ownerFromKey("user", "u1")).toEqual({ kind: "user", id: "u1" });
	});

	test("splits scoped values", () => {
		expect(ownerFromKey("team:t1")).toEqual({ kind: "team", id: "t1" });
		expect(ownerFromKey("system")).toEqual({ kind: "system" });
		expect(ownerKeyId("project:p1")).toBe("p1");
	});
});

describe("ownerOptions", () => {
	test("an admin gets personal plus every listed team and project", () => {
		const options = ownerOptions({
			kinds: ALL_OWNER_SCOPES,
			isAdmin: true,
			scopes: [],
			teams: [team],
			projects,
			keep: [],
		});
		expect(options).toEqual([
			{ value: "user", kind: "user", label: "Personal" },
			{ value: "team:t1", kind: "team", label: "Acme" },
			{ value: "project:p1", kind: "project", label: "web" },
			{ value: "project:p2", kind: "project", label: "ML" },
		]);
	});

	test("a scoped caller gets only their own scopes of the allowed kinds", () => {
		const options = ownerOptions({
			kinds: ["project"],
			isAdmin: false,
			scopes: ["team:t1", "project:p2"],
			teams: [team],
			projects,
			keep: [],
		});
		expect(options.map((o) => o.value)).toEqual(["project:p2"]);
	});

	test("lists a scoped caller's teams before their projects", () => {
		const options = ownerOptions({
			kinds: ALL_OWNER_SCOPES,
			isAdmin: false,
			scopes: ["project:p2", "team:t1"],
			teams: [team],
			projects,
			keep: [],
		});
		expect(options.map((o) => o.value)).toEqual([
			"user",
			"team:t1",
			"project:p2",
		]);
	});

	test("keeps the edited row's owner selectable, named by id when unlisted", () => {
		const options = ownerOptions({
			kinds: ALL_OWNER_SCOPES,
			isAdmin: false,
			scopes: ["project:p1"],
			teams: [],
			projects,
			keep: ["project:p1", "project:0192abcdef99", ""],
		});
		expect(options).toEqual([
			{ value: "user", kind: "user", label: "Personal" },
			{ value: "project:p1", kind: "project", label: "web" },
			{ value: "project:0192abcdef99", kind: "project", label: "0192abcd…" },
		]);
	});
});

describe("defaultOwnerKey", () => {
	const base = { kinds: ALL_OWNER_SCOPES, isAdmin: false, preset: "user" };

	test("an admin starts on the form's preset", () => {
		expect(
			defaultOwnerKey({ ...base, isAdmin: true, scopes: ["project:p1"] }),
		).toBe("user");
		expect(
			defaultOwnerKey({
				kinds: ["project"],
				isAdmin: true,
				scopes: [],
				preset: "",
			}),
		).toBe("");
	});

	test("one project scope starts on that project", () => {
		expect(
			defaultOwnerKey({ ...base, scopes: ["team:t1", "project:p1"] }),
		).toBe("project:p1");
	});

	test("several projects fall back to personal where the kind allows it", () => {
		const scopes = ["project:p1", "project:p2"];
		expect(defaultOwnerKey({ ...base, scopes })).toBe("user");
		expect(
			defaultOwnerKey({
				kinds: ["project"],
				isAdmin: false,
				scopes,
				preset: "",
			}),
		).toBe("");
	});

	test("a preselected scope wins only inside the caller's scopes", () => {
		const scopes = ["project:p1", "project:p2"];
		const kinds = ["project"] as const;
		expect(
			defaultOwnerKey({ kinds, isAdmin: false, scopes, preset: "project:p2" }),
		).toBe("project:p2");
		expect(
			defaultOwnerKey({ kinds, isAdmin: false, scopes, preset: "project:p9" }),
		).toBe("");
	});

	test("a lone scope of the only allowed kind is picked", () => {
		expect(
			defaultOwnerKey({
				kinds: ["team"],
				isAdmin: false,
				scopes: ["team:t1"],
				preset: "",
			}),
		).toBe("team:t1");
	});
});
