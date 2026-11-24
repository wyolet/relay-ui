import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const SERVICE_ACCOUNT = "sa-1";
const FLAG_ON = { shortcutLimit: true };

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
];

const team = {
	metadata: { id: TEAM, name: "platform", displayName: "Platform" },
	spec: { enabled: true },
};
const project = {
	metadata: { id: PROJECT, name: "search", displayName: "Search" },
	spec: { teamId: TEAM, enabled: true },
};
const serviceAccount = {
	metadata: {
		id: SERVICE_ACCOUNT,
		name: "indexer",
		displayName: "Indexer",
		owner: { kind: "project", id: PROJECT },
	},
	spec: { projectId: PROJECT, enabled: true },
};

const accounts = [
	{
		metadata: { id: "acct-team", name: "acct-team", owner: { kind: "team", id: TEAM } },
		spec: { kind: "team" },
	},
	{
		metadata: {
			id: "acct-project",
			name: "acct-project",
			owner: { kind: "project", id: PROJECT },
		},
		spec: { kind: "project" },
	},
	{
		metadata: {
			id: "acct-lane",
			name: "acct-lane",
			owner: { kind: "project", id: PROJECT },
		},
		spec: { kind: "service", holder: { kind: "serviceaccount", id: SERVICE_ACCOUNT } },
	},
];

const ownPolicy = {
	metadata: {
		id: "p-own",
		name: "platform-policy",
		displayName: "Platform policy",
		owner: { kind: "team", id: TEAM },
	},
	spec: {
		enabled: true,
		poolIds: ["pool-1"],
		models: ["anthropic"],
		budgets: [{ budgetId: "b-old", shared: true }],
		rateLimits: [{ rateLimitId: "r-old", models: null, shared: true }],
	},
};

const sharedPolicy = {
	metadata: {
		id: "p-shared",
		name: "search-shared",
		displayName: "Search shared",
		owner: { kind: "project", id: PROJECT },
	},
	spec: { enabled: true, poolIds: ["pool-2"], models: [] },
};

function binding(policyId: string, accountIds: string[]) {
	return {
		metadata: { id: `b-${policyId}`, name: `b-${policyId}` },
		spec: { policyId, accountIds },
	};
}

const catalog = {
	providers: [{ id: "prov-anthropic", name: "anthropic", displayName: "Anthropic" }],
	hosts: [{ id: "host-anthropic", name: "anthropic", displayName: "Anthropic" }],
	models: [
		{
			id: "m-sonnet",
			name: "claude-sonnet",
			displayName: "Claude Sonnet",
			providerId: "prov-anthropic",
			bindings: [{ hostId: "host-anthropic" }],
		},
	],
};

interface Sent {
	method: string;
	path: string;
	body: Record<string, unknown>;
}

interface Setup {
	policies?: unknown[];
	policyBindings?: unknown[];
	features?: Record<string, boolean>;
	/** A write that fails the first time it is sent. */
	failOnce?: { path: string; status: number; message: string };
	/** Models the policy grants, as `/policies/{ref}/models` lists them. */
	grants?: { policy: string; model: string; host: string }[];
}

const DETAILS: Record<string, unknown> = {
	[`teams/${TEAM}`]: team,
	"teams/platform": team,
	[`projects/${PROJECT}`]: project,
	"projects/search": project,
	[`service-accounts/${SERVICE_ACCOUNT}`]: serviceAccount,
	"service-accounts/indexer": serviceAccount,
};

/** Answers the form's reads and writes, and records each write in order. */
async function mockLimitApi(page: Page, setup: Setup = {}): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	const policies = setup.policies ?? [];
	await mockApi(page, {
		...EMPTY_GRAPH,
		features: setup.features ?? FLAG_ON,
		contexts,
		accounts,
		serviceAccounts: [serviceAccount],
		policies,
		policyBindings: setup.policyBindings ?? [],
	});
	await page.route("**/api/catalog/graph**", (route) => route.fulfill({ json: catalog }));
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			const detail = DETAILS[path];
			if (detail) return route.fulfill({ json: detail });
			const grant = setup.grants?.find((g) => path === `policies/${g.policy}/models`);
			if (grant) {
				return route.fulfill({
					json: {
						policy: { id: "", name: grant.policy },
						models: [
							{
								model: { id: `m-${grant.model}`, name: grant.model, displayName: grant.model },
								host: { id: `h-${grant.host}`, name: grant.host, displayName: grant.host },
								provider: { id: "prov", name: "prov" },
								binding: {},
								limits: [],
								matchedBy: [],
							},
						],
						excluded: [],
					},
				});
			}
			return route.fallback();
		}
		if (setup.failOnce?.path === path && !failed) {
			failed = true;
			return route.fulfill({
				status: setup.failOnce.status,
				json: { error: { type: "refused", message: setup.failOnce.message } },
			});
		}
		const body = request.postDataJSON() ?? {};
		sent.push({ method, path, body });
		const id = `made-${sent.length}`;
		const duplicated = /^policies\/([^/]+)\/duplicate$/.exec(path);
		if (duplicated) {
			const source = policies.find(
				(p) => (p as typeof ownPolicy).metadata.id === duplicated[1],
			) as typeof ownPolicy | undefined;
			return route.fulfill({
				json: {
					metadata: { id: "p-copy", name: "p-copy", displayName: body.displayName, owner: body.owner },
					spec: source?.spec ?? {},
				},
			});
		}
		if (path.startsWith("accounts/")) {
			return route.fulfill({ json: { binding: {}, previousBindingDeleted: false } });
		}
		return route.fulfill({
			json: { ...body, metadata: { id, name: id, ...body.metadata } },
		});
	});
	return sent;
}

function writes(sent: Sent[]): string[] {
	return sent.map((s) => `${s.method} ${s.path}`);
}

async function fillCap(page: Page, amount: string) {
	await page.getByRole("textbox", { name: "Amount in USD" }).fill(amount);
	await page.getByRole("button", { name: "Next" }).click();
}

test.describe("Add a limit", () => {
	test("the action shows on a team only with its flag on", async ({ page }) => {
		await mockLimitApi(page, { features: {} });
		await page.goto("/teams/platform");
		await expect(page.getByRole("heading", { name: "Platform", level: 1 })).toBeVisible();
		await expect(page.getByRole("link", { name: "Add a limit" })).toHaveCount(0);

		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(page).toHaveURL(/\/$/);
	});

	test("the action opens the form for its target", async ({ page }) => {
		await mockLimitApi(page);
		await page.goto("/teams/platform");
		await page.getByRole("link", { name: "Add a limit" }).click();
		await expect(page).toHaveURL(/\/limits\/add\?targetKind=team&id=team-1/);
		await expect(page.getByText("No policy yet")).toBeVisible();
	});

	test("an unknown target is not found", async ({ page }) => {
		await mockLimitApi(page);
		await page.goto("/limits/add?targetKind=team&id=nope");
		await expect(page.getByText(/^Not found/)).toBeVisible();
		await expect(page.getByRole("link", { name: "Back", exact: true })).toHaveAttribute(
			"href",
			/\/teams$/,
		);
	});

	test("a spend cap on a team under no policy makes one and binds it", async ({ page }) => {
		const sent = await mockLimitApi(page);
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Enter the cap in USD.")).toBeVisible();
		await fillCap(page, "500");

		await expect(
			page.getByText("Models without a price are refused under a spend cap."),
		).toBeVisible();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST budgets",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[0]?.body).toMatchObject({
			metadata: { displayName: "Platform cap", owner: { kind: "team", id: TEAM } },
			spec: { amountUsd: "500", period: "month", mode: "hard" },
		});
		expect(sent[1]?.body).toMatchObject({
			metadata: { displayName: "Platform limits", owner: { kind: "team", id: TEAM } },
			spec: { enabled: true, budgets: [{ budgetId: "made-1", shared: true }] },
		});
		expect(sent[2]?.body).toEqual({ policyId: "made-2" });
		await expect(page.getByRole("link", { name: "View spend cap" })).toBeVisible();
		await expect(page.getByRole("link", { name: "View policy" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Back to Platform" })).toBeVisible();
	});

	test("one cap for each account under the team sends shared: false", async ({ page }) => {
		const sent = await mockLimitApi(page);
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(page.getByText(/people and agents alike/)).toBeVisible();
		await page.getByRole("switch", { name: "One cap for each account under it" }).click();
		await fillCap(page, "20");
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(sent[1]?.body.spec).toMatchObject({
			budgets: [{ budgetId: "made-1", shared: false }],
		});
	});

	test("a rate limit on the team's own policy keeps what it holds", async ({ page }) => {
		const sent = await mockLimitApi(page, {
			policies: [ownPolicy],
			policyBindings: [binding("p-own", ["acct-team"])],
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(page.getByText("Policy Platform policy", { exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Rate limit" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Enter a whole number of 1 or more.")).toBeVisible();
		await page.getByRole("textbox", { name: "Maximum requests" }).fill("60");
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual(["POST rate-limits", "PUT policies/by-id/p-own"]);
		expect(sent[0]?.body).toMatchObject({
			metadata: { displayName: "Platform rate limit", owner: { kind: "team", id: TEAM } },
			spec: {
				enabled: true,
				rules: [{ amount: 60, meter: "requests", strategy: "sliding-window", window: 60 }],
			},
		});
		expect(sent[1]?.body.spec).toEqual({
			...ownPolicy.spec,
			rateLimits: [
				{ rateLimitId: "r-old", models: null, shared: true },
				{ rateLimitId: "made-1", models: null, shared: true },
			],
		});
		await expect(page.getByRole("link", { name: "View rate limit" })).toBeVisible();
	});

	test("a policy other accounts share is copied for the project", async ({ page }) => {
		const sent = await mockLimitApi(page, {
			policies: [sharedPolicy],
			policyBindings: [binding("p-shared", ["acct-project", "acct-other"])],
			grants: [{ policy: "search-shared", model: "gemma", host: "ollama" }],
		});
		await page.goto(`/limits/add?targetKind=project&id=${PROJECT}`);
		await expect(
			page.getByText(
				"Policy Search shared, shared with 1 other account: saving makes a copy for Search",
			),
		).toBeVisible();
		await fillCap(page, "49.50");
		await expect(
			page.getByText("These models will be refused once the cap applies"),
		).toBeVisible();
		await expect(page.getByText("gemma", { exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST budgets",
			"POST policies/p-shared/duplicate",
			"PUT policies/by-id/p-copy",
			"PUT accounts/acct-project/policy",
		]);
		expect(sent[1]?.body).toEqual({
			displayName: "Search limits",
			owner: { kind: "project", id: PROJECT },
		});
		expect(sent[2]?.body.spec).toEqual({
			...sharedPolicy.spec,
			budgets: [{ budgetId: "made-1", shared: true }],
		});
		expect(sent[3]?.body).toEqual({ policyId: "p-copy" });
	});

	test("a model-scoped rate limit on an agent links only those models", async ({ page }) => {
		const sent = await mockLimitApi(page);
		await page.goto(`/limits/add?targetKind=serviceaccount&id=${SERVICE_ACCOUNT}`);
		await page.getByRole("button", { name: "Rate limit" }).click();
		await expect(page.getByRole("switch")).toHaveCount(0);
		await page.getByRole("button", { name: "Tokens" }).click();
		await page.getByRole("textbox", { name: "Maximum tokens" }).fill("100000");
		await page.getByRole("button", { name: "hour" }).click();
		await page.getByRole("tab", { name: "Models" }).click();
		await page.getByRole("button", { name: /Claude Sonnet/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST rate-limits",
			"POST policies",
			"PUT accounts/acct-lane/policy",
		]);
		expect(sent[0]?.body).toMatchObject({
			metadata: { displayName: "Indexer rate limit", owner: { kind: "project", id: PROJECT } },
			spec: {
				rules: [
					{ amount: 100000, meter: "tokens", strategy: "sliding-window", window: 3600 },
				],
			},
		});
		expect(sent[1]?.body.spec).toMatchObject({
			rateLimits: [
				{ rateLimitId: "made-1", models: ["anthropic/claude-sonnet"], shared: true },
			],
		});
	});

	test("a policy set above the caller offers no fields", async ({ page }) => {
		const sent = await mockLimitApi(page, {
			policyBindings: [binding("p-hidden", ["acct-team"])],
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(
			page.getByText("Limited by a policy you can't see or change. Ask whoever set it."),
		).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Amount in USD" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Back to Platform" })).toBeVisible();
		expect(sent).toEqual([]);
	});

	test("a failed write stops the run and Retry resumes at it", async ({ page }) => {
		const sent = await mockLimitApi(page, {
			failOnce: { path: "policies", status: 409, message: "policy refused" },
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await fillCap(page, "500");
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByText("policy refused")).toBeVisible();
		await expect(page.getByText("1 of 3 steps are done and kept.")).toBeVisible();
		expect(writes(sent)).toEqual(["POST budgets"]);

		await page.getByRole("button", { name: "Retry" }).click();
		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST budgets",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[1]?.body.spec).toMatchObject({
			budgets: [{ budgetId: "made-1", shared: true }],
		});
	});
});
