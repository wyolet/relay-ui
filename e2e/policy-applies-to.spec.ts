import { expect, type Page, type Route, test } from "@playwright/test";
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

interface AccountPolicyWrite {
	accountId: string;
	policyId: string | null;
}

/** Answers PUT /accounts/{ref}/policy, refusing the ids in `refuse`; returns the writes. */
async function mockAccountPolicy(
	page: Page,
	refuse: string[] = [],
): Promise<AccountPolicyWrite[]> {
	const writes: AccountPolicyWrite[] = [];
	await page.route("**/api/accounts/*/policy", (route: Route) => {
		const accountId = new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
		const { policyId } = route.request().postDataJSON() as { policyId: string | null };
		writes.push({ accountId, policyId });
		const refused = refuse.includes(accountId);
		return route.fulfill({
			status: refused ? 403 : 200,
			contentType: "application/json",
			body: JSON.stringify(
				refused
					? { error: { type: "permission_error", message: "not allowed here" } }
					: { binding: null },
			),
		});
	});
	return writes;
}

/** Answers POST /policies with the row it would store, and lists it afterwards. */
async function mockPolicyCreate(page: Page, graph: MockGraph) {
	await page.route("**/api/policies", (route: Route) => {
		if (route.request().method() !== "POST") return route.fallback();
		const body = route.request().postDataJSON() as {
			metadata: { name: string; displayName: string; owner: object };
			spec: object;
		};
		const created = {
			metadata: { ...body.metadata, id: "policy-new", resourceVersion: "1" },
			spec: body.spec,
		};
		graph.policies.push(created);
		return route.fulfill({
			status: 201,
			contentType: "application/json",
			body: JSON.stringify(created),
		});
	});
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
	test("a new policy binds each picked account after it saves", async ({ page }) => {
		const graph = baseGraph();
		await inTeamWorkspace(page);
		await mockApi(page, graph);
		await mockPolicyCreate(page, graph);
		const writes = await mockAccountPolicy(page);

		await page.goto("/policies/new");
		await page.getByPlaceholder("Default policy").fill("Agents");
		await page.getByRole("button", { name: /Use every credential in scope/ }).click();
		await page.getByRole("button", { name: /^Accounts/ }).click();
		await page.getByText("Team · Platform").click();
		await page.getByText("Project · Search").click();
		await page.keyboard.press("Escape");
		await page.locator("form button[type=submit]").click();

		await expect(page).toHaveURL(/\/policies\/agents-\d+(\?|$)/);
		await expect.poll(() => writes.length).toBe(2);
		expect(writes).toEqual([
			{ accountId: "acct-team", policyId: "policy-new" },
			{ accountId: "acct-project", policyId: "policy-new" },
		]);
	});

	test("an edit unbinds a dropped account; an untouched picker writes nothing", async ({
		page,
	}) => {
		const graph = baseGraph();
		graph.policies = [policy("policy-1", "Agents", { kind: "team", id: TEAM })];
		graph.policyBindings = [binding("policy-1", ["acct-team", "acct-project"])];
		await inTeamWorkspace(page);
		await mockApi(page, graph);
		const writes = await mockAccountPolicy(page);
		await page.route("**/api/policies/by-id/policy-1", (route: Route) =>
			route.request().method() === "PUT"
				? route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(route.request().postDataJSON()),
					})
				: route.fallback(),
		);

		await page.goto("/policies/policy-1/edit");
		await expect(page.getByText("Project · Search")).toBeVisible();
		await page.getByRole("button", { name: "Save changes" }).click();
		await expect(page).toHaveURL(/\/policies\/policy-1(\?|$)/);
		expect(writes).toEqual([]);

		await page.goto("/policies/policy-1/edit");
		await page.getByRole("button", { name: "Remove Project · Search" }).click();
		await page.getByRole("button", { name: "Save changes" }).click();
		await expect.poll(() => writes.length).toBe(1);
		expect(writes[0]).toEqual({ accountId: "acct-project", policyId: null });
	});

	test("a refused bind keeps the policy and names the account", async ({ page }) => {
		const graph = baseGraph();
		await inTeamWorkspace(page);
		await mockApi(page, graph);
		await mockPolicyCreate(page, graph);
		const writes = await mockAccountPolicy(page, ["acct-project"]);

		await page.goto("/policies/new");
		await page.getByPlaceholder("Default policy").fill("Agents");
		await page.getByRole("button", { name: /Use every credential in scope/ }).click();
		await page.getByRole("button", { name: /^Accounts/ }).click();
		await page.getByText("Team · Platform").click();
		await page.getByText("Project · Search").click();
		await page.keyboard.press("Escape");
		await page.locator("form button[type=submit]").click();

		await expect(
			page.getByText(/Policy saved, but one account wasn't updated\. Project · Search: not allowed here/),
		).toBeVisible();
		await expect(page).toHaveURL(/\/policies\/agents-\d+(\?|$)/);
		expect(writes).toHaveLength(2);
	});

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

		await page.getByRole("button", { name: /Owner: Team Platform/ }).click();
		await page.getByText("Project Search").click();
		await expect(rows).toHaveCount(2);
		await expect(page.getByRole("button", { name: /Owner: 2 owners/ })).toBeVisible();

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
