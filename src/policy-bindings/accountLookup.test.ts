import { describe, expect, it } from "bun:test";
import { accountLabel } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { Project } from "@/api/types/project";
import type { components } from "@/api/types.gen";
import {
	accountBinding,
	defaultLane,
	describeDuplicate,
	heldAccounts,
	inOwnerScope,
	ownAccount,
} from "./accountLookup";

type Owner = components["schemas"]["Owner"];

function account(
	id: string,
	kind: Account["spec"]["kind"],
	owner: Owner,
	extra: Partial<Account["spec"]> = {},
): Account {
	return { metadata: { id, name: id, owner }, spec: { kind, ...extra } };
}

const sa = { kind: "serviceaccount", id: "sa1" } as const;
const alice = { kind: "user", id: "u1" } as const;

const teamAcct = account("team-a", "team", { kind: "team", id: "t1" });
const projectAcct = account("project-p", "project", {
	kind: "project",
	id: "p1",
});
const saAcct = account(
	"sa-ci",
	"service",
	{ kind: "project", id: "p1" },
	{
		holder: sa,
	},
);
const personal = account(
	"user-alice",
	"personal",
	{ kind: "user", id: "u1" },
	{
		holder: alice,
	},
);
const member = account(
	"alice-team",
	"member",
	{ kind: "team", id: "t1" },
	{
		holder: alice,
	},
);
const closedMember = account(
	"alice-old",
	"member",
	{ kind: "project", id: "p2" },
	{ holder: alice, closed: true },
);
const all = [teamAcct, projectAcct, saAcct, personal, member, closedMember];

const projects: Project[] = [
	{ metadata: { id: "p1", name: "p" }, spec: { teamId: "t1" } },
	{ metadata: { id: "p2", name: "q" }, spec: { teamId: "t2" } },
];

describe("accountLabel", () => {
	it("prefixes the kind", () => {
		expect(accountLabel(saAcct)).toBe("Service · sa-ci");
	});
});

describe("inOwnerScope", () => {
	it("lets the system hold every account", () => {
		expect(all.every((a) => inOwnerScope(a, { kind: "system" }, []))).toBe(
			true,
		);
	});

	it("holds a team's own and its projects' accounts", () => {
		const team = { kind: "team", id: "t1" } as const;
		expect(inOwnerScope(teamAcct, team, projects)).toBe(true);
		expect(inOwnerScope(saAcct, team, projects)).toBe(true);
		expect(inOwnerScope(closedMember, team, projects)).toBe(false);
		expect(inOwnerScope(personal, team, projects)).toBe(false);
	});

	it("holds only a project's or user's own accounts", () => {
		expect(
			inOwnerScope(teamAcct, { kind: "project", id: "p1" }, projects),
		).toBe(false);
		expect(inOwnerScope(personal, { kind: "user", id: "u1" }, projects)).toBe(
			true,
		);
	});
});

describe("held accounts", () => {
	it("matches the holder and skips closed accounts", () => {
		expect(heldAccounts(all, alice)).toEqual([personal, member]);
		expect(heldAccounts(all, sa)).toEqual([saAcct]);
	});

	it("defaults a lane to the service or personal account", () => {
		expect(defaultLane(all, sa)).toBe(saAcct);
		expect(defaultLane(all, alice)).toBe(personal);
		expect(defaultLane([member], alice)).toBeUndefined();
	});
});

describe("ownAccount", () => {
	it("finds teams and projects by kind and owner", () => {
		expect(ownAccount(all, { kind: "team", id: "t1" })).toBe(teamAcct);
		expect(ownAccount(all, { kind: "project", id: "p1" })).toBe(projectAcct);
		expect(ownAccount(all, { kind: "project", id: "p2" })).toBeUndefined();
	});

	it("finds a service account's by holder", () => {
		expect(ownAccount(all, { kind: "serviceaccount", id: "sa1" })).toBe(saAcct);
	});
});

describe("accountBinding", () => {
	const binding: PolicyBinding = {
		metadata: { id: "b1", name: "b1" },
		spec: { policyId: "pol", accountIds: ["sa-ci"] },
	};

	it("finds the binding listing the account", () => {
		expect(accountBinding([binding], "sa-ci")).toBe(binding);
		expect(accountBinding([binding], "team-a")).toBeUndefined();
	});
});

describe("describeDuplicate", () => {
	const message =
		'account a1 is already bound by policy binding "ci"; an account is bound to one policy';

	it("names the refused account", () => {
		expect(
			describeDuplicate(message, (id) =>
				id === "a1" ? 'Service account "sa-ci"' : undefined,
			),
		).toEqual({
			accountId: "a1",
			message:
				'Service account "sa-ci" is already bound by policy binding "ci"; an account is bound to one policy',
		});
	});

	it("keeps the raw id when the account is unknown", () => {
		expect(describeDuplicate(message, () => undefined)).toEqual({
			accountId: "a1",
			message,
		});
	});

	it("passes other messages through", () => {
		expect(describeDuplicate("already bound", () => "x")).toEqual({
			accountId: undefined,
			message: "already bound",
		});
	});
});
