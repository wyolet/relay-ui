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
	/** Serves `pseudoKinds: ["limits"]` and answers `POST /pseudo-limits`. */
	pseudo?: PseudoSetup;
}

interface MockAnswer {
	status: number;
	json: object;
}

interface PseudoSetup {
	/** Relay's answer to the dry run with no limit; defaults to case none. */
	current?: MockAnswer;
	/** The case and policy every answer with a limit names. */
	policyCase?: "none" | "own" | "copy";
	unpricedModels?: string[];
	dryRunWarnings?: object[];
	/** Relay's answer to the first `POST /pseudo-limits` that isn't a dry run. */
	refuseOnce?: MockAnswer;
}

const LIMIT_POLICY = { id: "pol-1", name: "platform-limits" };

/** Relay's answer to a limit: the rows it makes and changes for the case, in write order. */
function pseudoLimitsAnswer(
	body: { spec?: { budget?: object } },
	pseudo: PseudoSetup,
	dryRun: boolean,
) {
	const policyCase = pseudo.policyCase ?? "none";
	const budget = Boolean(body.spec?.budget);
	const limit = budget
		? { kind: "budget", id: "b-1", name: "platform-cap" }
		: { kind: "rate-limit", id: "rl-1", name: "platform-rate-limit" };
	const policy = { kind: "policy", ...LIMIT_POLICY };
	const binding = { kind: "policy-binding", id: "pb-1", name: "platform-limits-binding" };
	return {
		case: policyCase,
		policy: LIMIT_POLICY,
		...(budget ? { budget: limit } : { rateLimit: limit }),
		created: policyCase === "own" ? [limit] : [limit, policy, binding],
		...(policyCase === "own" ? { updated: [policy] } : {}),
		...(budget && pseudo.unpricedModels ? { unpricedModels: pseudo.unpricedModels } : {}),
		warnings: dryRun ? (pseudo.dryRunWarnings ?? []) : [],
	};
}

const NO_POLICY: MockAnswer = { status: 200, json: { case: "none", warnings: [] } };

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
	const { pseudo } = setup;
	await mockApi(page, {
		...EMPTY_GRAPH,
		features: setup.features ?? FLAG_ON,
		...(pseudo ? { pseudoKinds: ["limits"] } : {}),
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
		if (path === "pseudo-limits" && pseudo) {
			const body = request.postDataJSON() ?? {};
			const dryRun = new URL(request.url()).searchParams.get("dryRun") === "true";
			const current = dryRun && !body.spec?.budget && !body.spec?.rateLimit;
			const label = current ? "pseudo-limits?current" : dryRun ? "pseudo-limits?dryRun" : path;
			sent.push({ method, path: label, body });
			if (current) {
				const answer = pseudo.current ?? NO_POLICY;
				return route.fulfill({ status: answer.status, json: answer.json });
			}
			if (!dryRun && pseudo.refuseOnce && !failed) {
				failed = true;
				return route.fulfill({ status: pseudo.refuseOnce.status, json: pseudo.refuseOnce.json });
			}
			return route.fulfill({
				status: dryRun ? 200 : 201,
				json: pseudoLimitsAnswer(body, pseudo, dryRun),
			});
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
		await expect(page.getByText("Enter a whole number, 1 or more.")).toBeVisible();
		const amount = page.getByRole("textbox", { name: "Maximum requests" });
		await amount.fill("1.5");
		await page.getByRole("button", { name: "Next" }).click();
		await expect(amount).toHaveAttribute("aria-invalid", "true");
		await expect(amount).toHaveAccessibleDescription("Enter a whole number, 1 or more.");
		await expect(page.getByRole("button", { name: "Add limit" })).toHaveCount(0);
		await amount.fill("60");
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

const submits = (sent: Sent[]) => sent.filter((s) => s.path === "pseudo-limits");

test.describe("Add a limit in one request", () => {
	test("a spend cap on a team: relay's case, the dry run's list, one request", async ({
		page,
	}) => {
		const sent = await mockLimitApi(page, { pseudo: {} });
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(page.getByText("No policy yet")).toBeVisible();
		await page.getByRole("button", { name: "Day", exact: true }).click();
		await fillCap(page, "0.01");

		const planned = page.getByRole("list", { name: "What Add limit does" });
		await expect(planned.getByRole("listitem")).toHaveText([
			/^Budget\s*platform-cap/,
			/^Policy\s*platform-limits/,
			/^Policy binding\s*platform-limits-binding/,
		]);
		await expect(page.getByText("Models without a price are refused")).toHaveCount(0);
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pseudo-limits?current",
			"POST pseudo-limits?dryRun",
			"POST pseudo-limits",
		]);
		expect(sent[0]?.body).toEqual({ spec: { target: { kind: "team", id: TEAM } } });
		expect(submits(sent)[0]?.body).toEqual({
			metadata: { displayName: "Platform cap" },
			spec: {
				target: { kind: "team", id: TEAM },
				budget: { amountUsd: "0.01", period: "day", mode: "hard" },
			},
		});
		expect(sent[1]?.body).toEqual(sent[2]?.body ?? {});
		await expect(page.getByText("platform-cap", { exact: true })).toBeVisible();
		await expect(page.getByText("platform-limits", { exact: true })).toBeVisible();
		await expect(page.getByText("Made a policy.")).toBeVisible();
		await expect(page.getByRole("link", { name: "View spend cap" })).toHaveAttribute(
			"href",
			/\/policies\/budgets\/platform-cap$/,
		);
		await expect(page.getByRole("link", { name: "View policy" })).toHaveAttribute(
			"href",
			/\/policies\/platform-limits$/,
		);
	});

	test("a rate limit on an agent's own policy: Makes and Changes, sent for the service account", async ({
		page,
	}) => {
		const sent = await mockLimitApi(page, {
			policies: [ownPolicy],
			pseudo: {
				policyCase: "own",
				current: {
					status: 200,
					json: {
						case: "own",
						current: {
							policy: { id: "p-own", name: "platform-policy" },
							pools: [],
							hiddenPools: 0,
							models: [],
							linksNoPools: false,
						},
						warnings: [],
					},
				},
			},
		});
		await page.goto(`/limits/add?targetKind=serviceaccount&id=${SERVICE_ACCOUNT}`);
		await expect(page.getByText("Policy Platform policy", { exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Rate limit" }).click();
		await page.getByRole("textbox", { name: "Maximum requests" }).fill("3");
		await page.getByRole("button", { name: "Next" }).click();

		const review = page.getByRole("region", { name: "What Add limit does" });
		await expect(review.getByRole("list", { name: "Makes" }).getByRole("listitem")).toHaveText([
			/^Rate limit\s*platform-rate-limit/,
		]);
		await expect(review.getByRole("list", { name: "Changes" }).getByRole("listitem")).toHaveText(
			[/^Policy\s*platform-limits/],
		);
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(submits(sent).map((s) => s.body)).toEqual([
			{
				metadata: { displayName: "Indexer rate limit" },
				spec: {
					target: { kind: "service-account", id: SERVICE_ACCOUNT },
					rateLimit: {
						enabled: true,
						rules: [{ amount: 3, meter: "requests", strategy: "sliding-window", window: 60 }],
					},
				},
			},
		]);
		await expect(page.getByText("Added to its policy.")).toBeVisible();
		await expect(page.getByRole("link", { name: "View rate limit" })).toBeVisible();
	});

	test("unpriced models and a warning show on the review step without blocking", async ({
		page,
	}) => {
		const warning = "The budget's policy grants a model with no price.";
		const sent = await mockLimitApi(page, {
			pseudo: {
				unpricedModels: ["google/gemma4-e4b"],
				dryRunWarnings: [
					{ code: "budget_unpriced", kind: "budget", message: warning, pointer: "/spec/budget" },
				],
			},
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await fillCap(page, "5");

		const unpriced = page
			.getByRole("status")
			.filter({ hasText: "These models will be refused once the cap applies" });
		await expect(unpriced.getByRole("listitem")).toHaveText(["google/gemma4-e4b"]);
		const warned = page.getByRole("status").filter({ hasText: "Relay will accept this, with warnings" });
		await expect(warned.getByRole("listitem")).toHaveText([warning]);
		await expect(page.getByRole("alert")).toHaveCount(0);

		await page.getByRole("button", { name: "Add limit" }).click();
		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(submits(sent)).toHaveLength(1);
	});

	test("a refused amount returns to the limit step with relay's message by the field", async ({
		page,
	}) => {
		const sent = await mockLimitApi(page, {
			pseudo: {
				refuseOnce: {
					status: 400,
					json: {
						error: { type: "invalid_request_error", message: "amountUsd is too small" },
						pointer: "/spec/budget/amountUsd",
					},
				},
			},
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await fillCap(page, "0.01");
		await page.getByRole("button", { name: "Add limit" }).click();

		const amount = page.getByRole("textbox", { name: "Amount in USD" });
		await expect(amount).toHaveAttribute("aria-invalid", "true");
		await expect(amount).toHaveAccessibleDescription("amountUsd is too small");
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByRole("button", { name: "Add limit" })).toHaveCount(0);

		await amount.fill("1");
		await expect(amount).not.toHaveAttribute("aria-invalid", "true");
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Add limit" }).click();
		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(submits(sent).map((s) => s.body.spec)).toMatchObject([
			{ budget: { amountUsd: "0.01" } },
			{ budget: { amountUsd: "1" } },
		]);
	});

	test("a plan issue shows under the refusal heading on the review step", async ({ page }) => {
		await mockLimitApi(page, {
			pseudo: {
				refuseOnce: {
					status: 422,
					json: {
						error: { type: "invalid_request_error", code: "plan_issue", message: "plan issues" },
						issues: [
							{
								code: "policy_serves_nothing",
								kind: "policy",
								message: "The policy serves no model.",
								pointer: "/spec/target",
							},
							{ code: "budget_unpriced", kind: "budget" },
						],
					},
				},
			},
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await fillCap(page, "5");
		await page.getByRole("button", { name: "Add limit" }).click();

		const refused = page.getByRole("alert").filter({ hasText: "Relay would refuse this setup" });
		await expect(refused.getByRole("listitem")).toHaveText([
			"The policy serves no model.",
			"A row you can't see blocks this.",
		]);
		await expect(page.getByRole("button", { name: "Add limit" })).toBeEnabled();
	});

	test("a busy relay asks to retry and keeps Add limit open", async ({ page }) => {
		const sent = await mockLimitApi(page, {
			pseudo: {
				refuseOnce: {
					status: 503,
					json: { error: { type: "server_error", message: "plans are loading" } },
				},
			},
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await fillCap(page, "5");
		await page.getByRole("button", { name: "Add limit" }).click();
		await expect(page.getByRole("alert")).toHaveText("Relay is busy. Try again in a moment.");

		await page.getByRole("button", { name: "Add limit" }).click();
		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(submits(sent)).toHaveLength(2);
	});

	test("a policy relay says is set above the caller offers no fields, with relay's message", async ({
		page,
	}) => {
		const sent = await mockLimitApi(page, {
			pseudo: {
				current: {
					status: 403,
					json: {
						error: {
							type: "permission_error",
							code: "policy_set_above",
							message: "The organization sets this team's policy.",
						},
						pointer: "/spec/target",
					},
				},
			},
		});
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await expect(
			page.getByText("Limited by a policy you can't see or change. Ask whoever set it."),
		).toBeVisible();
		await expect(page.getByText("The organization sets this team's policy.")).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Amount in USD" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
		expect(writes(sent)).toEqual(["POST pseudo-limits?current"]);
	});

	test("one cap for each account runs the chain while relay's body has no link options", async ({
		page,
	}) => {
		const sent = await mockLimitApi(page, { pseudo: {} });
		await page.goto(`/limits/add?targetKind=team&id=${TEAM}`);
		await page.getByRole("switch", { name: "One cap for each account under it" }).click();
		await fillCap(page, "20");
		await expect(page.getByText("What Add limit does, in this order.")).toBeVisible();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pseudo-limits?current",
			"POST budgets",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[2]?.body.spec).toMatchObject({
			budgets: [{ budgetId: "made-2", shared: false }],
		});
	});

	test("a model-scoped rate limit runs the chain", async ({ page }) => {
		const sent = await mockLimitApi(page, { pseudo: {} });
		await page.goto(`/limits/add?targetKind=serviceaccount&id=${SERVICE_ACCOUNT}`);
		await page.getByRole("button", { name: "Rate limit" }).click();
		await page.getByRole("textbox", { name: "Maximum requests" }).fill("10");
		await page.getByRole("tab", { name: "Models" }).click();
		await page.getByRole("button", { name: /Claude Sonnet/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Add limit" }).click();

		await expect(page.getByRole("heading", { name: "Limit added" })).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pseudo-limits?current",
			"POST rate-limits",
			"POST policies",
			"PUT accounts/acct-lane/policy",
		]);
		expect(sent[2]?.body.spec).toMatchObject({
			rateLimits: [{ rateLimitId: "made-2", models: ["anthropic/claude-sonnet"], shared: true }],
		});
	});
});
