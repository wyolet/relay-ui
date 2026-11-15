import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, type MockGraph, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const OTHER_TEAM_PROJECT = "project-2";

const contexts = [
	{ kind: "personal", id: "test-user", name: "test", displayName: "test", admin: true },
	{ kind: "team", id: TEAM, name: "platform", displayName: "Platform", admin: true },
	{
		kind: "project",
		id: PROJECT,
		name: "search",
		displayName: "Search",
		teamId: TEAM,
		admin: true,
	},
	{
		kind: "project",
		id: OTHER_TEAM_PROJECT,
		name: "billing",
		displayName: "Billing",
		teamId: "team-2",
		admin: true,
	},
];

function account(id: string, kind: string, displayName: string, owner: object) {
	return {
		metadata: { id, name: id, displayName, owner },
		spec: { kind },
	};
}

const teamAccount = account("acct-team", "team", "Platform", {
	kind: "team",
	id: TEAM,
});
const projectAccount = account("acct-project", "project", "Search", {
	kind: "project",
	id: PROJECT,
});

function policy(id: string, displayName: string, owner: object) {
	return {
		metadata: { id, name: id, displayName, owner, resourceVersion: "1" },
		spec: { enabled: true, models: [], poolIds: null },
	};
}

function binding(policyId: string, accountIds: string[]) {
	return {
		metadata: { id: `b-${policyId}`, name: `b-${policyId}`, owner: { kind: "team", id: TEAM } },
		spec: { policyId, accountIds, enabled: true },
	};
}

/** Opens every page in the team workspace, as the switcher would leave it. */
async function inTeamWorkspace(page: Page) {
	await page.addInitScript((team) => {
		localStorage.setItem(
			"work-context",
			JSON.stringify({ state: { selected: { kind: "team", id: team } }, version: 0 }),
		);
	}, TEAM);
}

function baseGraph(): MockGraph {
	return {
		...EMPTY_GRAPH,
		policies: [],
		contexts,
		accounts: [teamAccount, projectAccount],
		policyBindings: [],
	};
}

test.describe("Policy applies to", () => {
	test("the policies table flags a policy that applies to no one", async ({ page }) => {
		const graph = baseGraph();
		graph.policies = [
			policy("policy-1", "Bound", { kind: "team", id: TEAM }),
			policy("policy-2", "Unbound", { kind: "team", id: TEAM }),
		];
		graph.policyBindings = [binding("policy-1", ["acct-team"])];
		await inTeamWorkspace(page);
		await mockApi(page, graph);

		await page.goto("/policies");
		const bound = page.getByRole("row", { name: /Bound/ }).first();
		await expect(bound).toContainText("1 account");
		await expect(page.getByRole("row", { name: /Unbound/ })).toContainText("No one");
	});
});

test.describe("Owner filter", () => {
	test("defaults to the workspace and takes several owners", async ({ page }) => {
		const graph = baseGraph();
		graph.policies = [
			policy("p-team", "Team policy", { kind: "team", id: TEAM }),
			policy("p-project", "Project policy", { kind: "project", id: PROJECT }),
			policy("p-mine", "My policy", { kind: "user", id: "test-user" }),
			policy("p-host", "Tier preset", { kind: "host", id: "host-1" }),
		];
		await inTeamWorkspace(page);
		await mockApi(page, graph);

		await page.goto("/policies");
		const rows = page.locator("tbody tr");
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText("Team policy");

		await page.getByRole("button", { name: "Filters", exact: true }).click();
		await page.getByRole("button", { name: /Owner: Team Platform/ }).click();
		await page.getByText("Project Search").click();
		await expect(rows).toHaveCount(2);
		await expect(page.getByRole("button", { name: /Owner: 2 owners/ })).toBeVisible();
		await expect(page.getByRole("button", { name: /^Filters\s*1$/ })).toBeVisible();

		await page.getByRole("button", { name: "Show all owners" }).click();
		await expect(rows).toHaveCount(4);
		await expect(page.getByRole("button", { name: /Owner: All/ })).toBeVisible();
	});
});

test.describe("Service account form", () => {
	test("creates in the workspace and offers only the team's projects", async ({
		page,
	}) => {
		await inTeamWorkspace(page);
		await mockApi(page, baseGraph());

		await page.goto("/service-accounts/new");
		await expect(page.getByText("Creating in")).toBeVisible();
		await expect(page.getByRole("button", { name: "Change where this is created" })).toBeVisible();

		await page.getByText("Pick a project…").click();
		await expect(page.getByRole("option", { name: "Search" })).toBeVisible();
		await expect(page.getByRole("option", { name: "Billing" })).toHaveCount(0);
	});
});
