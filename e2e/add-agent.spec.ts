import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const HOST = "host-anthropic";
const KEYLESS_HOST = "host-local";
const SERVICE_ACCOUNT = "sa-1";

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

const catalog = {
	providers: [
		{ id: "prov-anthropic", name: "anthropic", displayName: "Anthropic" },
		{ id: "prov-google", name: "google", displayName: "Google" },
	],
	hosts: [
		{ id: HOST, name: "anthropic", displayName: "Anthropic" },
		{ id: KEYLESS_HOST, name: "local", displayName: "Local Ollama" },
	],
	models: [
		{
			id: "m-sonnet",
			name: "claude-sonnet",
			displayName: "Claude Sonnet",
			providerId: "prov-anthropic",
			bindings: [{ hostId: HOST }],
		},
		{
			id: "m-gemma",
			name: "gemma",
			displayName: "Gemma",
			providerId: "prov-google",
			bindings: [{ hostId: KEYLESS_HOST }],
		},
	],
};

const hosts = [
	{ metadata: { id: HOST, name: "anthropic" }, spec: { baseURL: "https://anthropic.test" } },
	{
		metadata: { id: KEYLESS_HOST, name: "local" },
		spec: { baseURL: "http://local.test", noAuth: true },
	},
];

function providerAccount(id: string, displayName: string, owner: object, hostId = HOST) {
	return {
		metadata: { id, name: id, displayName, owner },
		spec: { kind: "provider", hostId },
	};
}

const projectAccount = providerAccount("acct-project", "Search Anthropic", {
	kind: "project",
	id: PROJECT,
});
const myAccount = providerAccount("acct-mine", "My Anthropic", {
	kind: "user",
	id: "test-user",
});
const keylessAccount = providerAccount(
	"acct-local",
	"Office Ollama account",
	{ kind: "organization" },
	KEYLESS_HOST,
);
const keylessPool = {
	metadata: { id: "pool-local", name: "local-pool", displayName: "Local pool" },
	spec: { hostId: KEYLESS_HOST, accountIds: ["acct-local"] },
};
const projectPolicy = {
	metadata: {
		id: "pol-search",
		name: "search-default",
		displayName: "Search default",
		owner: { kind: "project", id: PROJECT },
	},
	spec: { enabled: true },
};
const laneAccount = {
	metadata: { id: "acct-lane", name: "acct-lane", owner: { kind: "project", id: PROJECT } },
	spec: { kind: "service", holder: { kind: "serviceaccount", id: SERVICE_ACCOUNT } },
};

interface Sent {
	method: string;
	path: string;
	body: Record<string, unknown>;
}

interface FailOnce {
	path: string;
	status: number;
	message: string;
}

interface PseudoBody {
	metadata: { name: string };
	spec: {
		policyId?: string;
		access?: { accountIds?: string[]; poolIds?: string[]; models?: string[] };
		key?: { displayName?: string };
	};
}

/** Relay's answer to a one-request agent: rows in write order, the plaintext unless a dry run. */
function pseudoAnswer(body: PseudoBody, dryRun: boolean, warnings: object[] = []) {
	const access = body.spec.access;
	const madePolicy = Boolean(
		access?.accountIds?.length || access?.poolIds?.length || access?.models?.length,
	);
	const name = body.metadata.name;
	const row = (kind: string, rowName: string) => ({ kind, id: `${kind}-1`, name: rowName });
	const keyName = (body.spec.key?.displayName ?? "key").toLowerCase().replaceAll(" ", "-");
	return {
		created: [
			row("service-account", name),
			row("account", `sa-${name}`),
			...(madePolicy ? [row("policy", `${name}-policy`)] : []),
			...(madePolicy || body.spec.policyId ? [row("policy-binding", `${name}-binding`)] : []),
			row("key", keyName),
		],
		serviceAccount: { id: SERVICE_ACCOUNT, name },
		account: { id: "acct-lane", name: `sa-${name}` },
		...(madePolicy || body.spec.policyId
			? { policy: { id: "policy-1", name: `${name}-policy` } }
			: {}),
		pools: [],
		shares: [],
		key: { id: "key-1", name: keyName, ...(dryRun ? {} : { plaintext: "sk-wr-test-secret" }) },
		warnings,
	};
}

interface AgentMock {
	/** A write that fails the first time. */
	failOnce?: FailOnce;
	/** Serves `pseudoKinds: ["agents"]`. */
	oneRequest?: boolean;
	/** Relay's answer to the first `POST /pseudo-agents` that isn't a dry run. */
	refuseOnce?: { status: number; json: object };
	/** Relay's answer to the first dry run. */
	refuseDryRunOnce?: { status: number; json: object };
	/** The warnings every dry run answers. */
	dryRunWarnings?: object[];
	/** Serves `serviceAccountOwnerKinds`. */
	ownerKinds?: string[];
	personalAccountEffective?: { state: "on" | "off"; source: string };
	/** Collects the `usable_by` of every picker read. */
	usableBy?: string[];
}

/** Answers the form's reads and writes; a dry run is recorded as `pseudo-agents?dryRun`. */
async function mockAgentApi(
	page: Page,
	{
		failOnce,
		oneRequest,
		refuseOnce,
		refuseDryRunOnce,
		dryRunWarnings,
		ownerKinds,
		personalAccountEffective,
		usableBy,
	}: AgentMock = {},
): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	let dryRunRefused = false;
	await mockApi(page, {
		...EMPTY_GRAPH,
		contexts,
		hosts,
		policies: [projectPolicy],
		...(oneRequest ? { pseudoKinds: ["agents"] } : {}),
		...(ownerKinds ? { serviceAccountOwnerKinds: ownerKinds } : {}),
		...(personalAccountEffective ? { personalAccountEffective } : {}),
	});
	await page.route("**/api/catalog/graph**", (route) =>
		route.fulfill({ json: catalog }),
	);
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			const usable = url.searchParams.get("usable_by");
			if (usable && (path === "accounts" || path === "pools" || path === "policies")) {
				usableBy?.push(`${path} ${usable}`);
			}
			if (path === "pools" && url.searchParams.has("usable_by")) {
				return route.fulfill({ json: { items: [keylessPool], total: 1 } });
			}
			if (path !== "accounts") return route.fallback();
			if (url.searchParams.get("kind") === "service") {
				return route.fulfill({ json: { items: [laneAccount], total: 1 } });
			}
			const items = url.searchParams.has("usable_by")
				? [projectAccount, keylessAccount]
				: [projectAccount, myAccount, keylessAccount];
			return route.fulfill({ json: { items, total: items.length } });
		}
		if (failOnce?.path === path && !failed) {
			failed = true;
			return route.fulfill({
				status: failOnce.status,
				json: { error: { type: "refused", message: failOnce.message } },
			});
		}
		const body = request.postDataJSON() ?? {};
		if (path === "pseudo-agents") {
			const dryRun = url.searchParams.get("dryRun") === "true";
			sent.push({ method, path: dryRun ? "pseudo-agents?dryRun" : path, body });
			if (!dryRun && refuseOnce && !failed) {
				failed = true;
				return route.fulfill({ status: refuseOnce.status, json: refuseOnce.json });
			}
			if (dryRun && refuseDryRunOnce && !dryRunRefused) {
				dryRunRefused = true;
				return route.fulfill({ status: refuseDryRunOnce.status, json: refuseDryRunOnce.json });
			}
			return route.fulfill({
				status: dryRun ? 200 : 201,
				json: pseudoAnswer(body, dryRun, dryRun ? dryRunWarnings : []),
			});
		}
		sent.push({ method, path, body });
		const id = `made-${sent.length}`;
		if (path === "service-accounts") {
			return route.fulfill({
				json: { ...body, metadata: { ...body.metadata, id: SERVICE_ACCOUNT } },
			});
		}
		if (path === "keys") {
			return route.fulfill({
				json: {
					plaintext: "sk-wr-test-secret",
					key: { metadata: { id, name: "indexer-key" }, spec: body.spec },
				},
			});
		}
		if (path.endsWith("/shares")) {
			return route.fulfill({
				json: { metadata: { id: "acct-share", name: "acct-share" }, spec: {} },
			});
		}
		return route.fulfill({
			json: { ...body, metadata: { ...body.metadata, id, name: id } },
		});
	});
	return sent;
}

async function nameAgentInProject(page: Page) {
	await page.goto("/service-accounts/add-agent");
	await page.getByPlaceholder("Support triage agent").fill("Indexer");
	await page.getByText("Pick a project…").click();
	await page.getByRole("option", { name: "Search" }).click();
	await page.getByRole("button", { name: "Next" }).click();
}

test.describe("Add agent", () => {
	test("offers only the owner kinds relay can place an agent in", async ({ page }) => {
		await mockAgentApi(page);
		await page.goto("/service-accounts/add-agent");
		const owner = page.getByRole("group", { name: "Owner" });
		await expect(
			owner.getByRole("button", { name: /^Project/, pressed: true }),
		).toBeVisible();
		for (const kind of [/^Personal/, /^Team/]) {
			const card = owner.getByRole("button", { name: kind });
			await expect(card).toHaveAttribute("aria-disabled", "true");
			await card.click({ force: true });
			await expect(card).toHaveAttribute("aria-pressed", "false");
		}

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Name the agent.")).toBeVisible();
		await expect(page.getByText("Pick the project the agent belongs to.")).toBeVisible();
	});

	test("with every credential and every model it makes no policy", async ({ page }) => {
		const sent = await mockAgentApi(page);
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST service-accounts",
			"POST keys",
		]);
		expect(sent[1]?.body.spec).toMatchObject({
			principal: { kind: "serviceaccount", id: SERVICE_ACCOUNT },
		});
	});

	test("shares, pools, makes a policy, binds it and issues the key", async ({ page }) => {
		const sent = await mockAgentApi(page);
		await nameAgentInProject(page);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Pick an account, or use every credential.")).toBeVisible();
		await expect(page.getByRole("button", { name: /Office Ollama account/ })).toHaveCount(0);
		await expect(page.getByRole("group", { name: "Pools" })).toHaveCount(0);

		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST service-accounts",
			"POST accounts/acct-mine/shares",
			"POST pools",
			"POST policies",
			"PUT accounts/acct-lane/policy",
			"POST keys",
		]);
		expect(sent[0]?.body.metadata).toMatchObject({ labels: { "sa-type": "agent" } });
		expect(sent[1]?.body).toEqual({ receiver: { kind: "project", id: PROJECT } });
		expect(sent[2]?.body.spec).toEqual({
			hostId: HOST,
			accountIds: ["acct-project", "acct-share"],
		});
		expect(sent[3]?.body.spec).toMatchObject({ poolIds: ["made-3"], models: [] });
		for (const made of [sent[2], sent[3]]) {
			expect(made?.body.metadata).toMatchObject({
				labels: { "agent-id": SERVICE_ACCOUNT },
			});
		}
		expect(sent[4]?.body).toEqual({ policyId: "made-4" });
		await expect(page.getByRole("link", { name: "View policy" })).toBeVisible();
	});

	test("a failed write stops the run and Retry resumes at it", async ({ page }) => {
		const sent = await mockAgentApi(page, {
			failOnce: { path: "pools", status: 409, message: "pool refused" },
		});
		await nameAgentInProject(page);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("pool refused")).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual(["service-accounts"]);
		await expect(page.getByText("2 of 6 steps are done and kept.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Back to the form" })).toHaveCount(0);

		await page.getByRole("button", { name: "Retry" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual([
			"service-accounts",
			"pools",
			"policies",
			"accounts/acct-lane/policy",
			"keys",
		]);
	});

	test("a refused first write leads back to the form as it was", async ({ page }) => {
		const sent = await mockAgentApi(page, {
			failOnce: {
				path: "service-accounts",
				status: 403,
				message: "not allowed in this project",
			},
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByRole("alert")).toHaveText("not allowed in this project");
		expect(sent).toEqual([]);
		await page.getByRole("button", { name: "Back to the form" }).click();

		await expect(page.getByRole("button", { name: "Create agent" })).toBeVisible();
		await page.getByRole("button", { name: "Back" }).click();
		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByPlaceholder("Support triage agent")).toHaveValue("Indexer");
	});

	test("a double-click on Next does not create the agent", async ({ page }) => {
		const sent = await mockAgentApi(page);
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).dblclick();
		await expect(page.getByRole("button", { name: "Create agent" })).toBeVisible();
		expect(sent).toEqual([]);
	});
});

const AGENT_METADATA = {
	name: expect.stringMatching(/^indexer-/),
	displayName: "Indexer",
	description: "",
	labels: { "sa-type": "agent" },
	owner: { kind: "project", id: PROJECT },
};
const AGENT_KEY = {
	displayName: "Indexer key",
	passthroughAllowed: false,
	payloadLoggingEnabled: false,
};

const submits = (sent: Sent[]) => sent.filter((s) => s.path === "pseudo-agents");

test.describe("Add agent in one request", () => {
	test("every credential: one request, the dry run lists what it makes", async ({ page }) => {
		const sent = await mockAgentApi(page, { oneRequest: true });
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();

		const planned = page.getByRole("list", { name: "What Create agent makes" });
		await expect(planned.getByRole("listitem")).toHaveText([
			/^Service account\s*indexer-/,
			/^Account\s*sa-indexer-/,
			/^Key\s*indexer-key/,
		]);
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual(["pseudo-agents?dryRun", "pseudo-agents"]);
		expect(submits(sent)[0]?.body).toEqual({
			metadata: AGENT_METADATA,
			spec: { access: { everyCredential: true }, key: AGENT_KEY },
		});
		expect(sent[0]?.body).toEqual(sent[1]?.body ?? {});
		await expect(page.getByRole("link", { name: "View policy" })).toHaveCount(0);
	});

	test("a dry run's warning shows on the last step, marks its field and still lets the user create", async ({
		page,
	}) => {
		const warning = "A policy above excludes anthropic/claude-opus.";
		const sent = await mockAgentApi(page, {
			oneRequest: true,
			dryRunWarnings: [
				{
					code: "model_ref_blocked",
					kind: "policy",
					message: warning,
					pointer: "/spec/access/models",
				},
			],
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();

		const warned = page
			.getByRole("status")
			.filter({ hasText: "Relay will accept this, with warnings" });
		await expect(warned.getByRole("listitem")).toHaveText([warning]);
		await expect(page.getByRole("alert")).toHaveCount(0);

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByText(warning)).toBeVisible();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(warned).toBeVisible();

		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)).toHaveLength(1);
	});

	test("a new key name on the last step reruns the dry run once typing settles", async ({
		page,
	}) => {
		const sent = await mockAgentApi(page, { oneRequest: true });
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		const planned = page.getByRole("list", { name: "What Create agent makes" });
		await expect(planned.getByRole("listitem").last()).toHaveText(/^Key\s*indexer-key/);

		await page.getByRole("textbox", { name: "Key name" }).pressSequentially("Crawler key");
		await expect(planned.getByRole("listitem").last()).toHaveText(/^Key\s*crawler-key/);
		const dryRuns = sent.filter((s) => s.path === "pseudo-agents?dryRun");
		expect(dryRuns).toHaveLength(2);
		expect(dryRuns[1]?.body.spec).toMatchObject({ key: { displayName: "Crawler key" } });
	});

	test("picked accounts and models: one request naming them", async ({ page }) => {
		const sent = await mockAgentApi(page, { oneRequest: true });
		await nameAgentInProject(page);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await expect(page.getByRole("button", { name: /Office Ollama account/ })).toHaveCount(0);
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: /^Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent).map((s) => s.body)).toEqual([
			{
				metadata: AGENT_METADATA,
				spec: {
					access: {
						everyCredential: false,
						accountIds: ["acct-project", "acct-mine"],
						models: ["anthropic"],
					},
					key: AGENT_KEY,
				},
			},
		]);
		await expect(page.getByRole("link", { name: "View policy" })).toBeVisible();
	});

	test("an existing policy: one request binding it", async ({ page }) => {
		const sent = await mockAgentApi(page, { oneRequest: true });
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Use a policy" }).click();
		await page.getByRole("combobox", { name: "Policy" }).click();
		await page.getByRole("option", { name: "Search default" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent).map((s) => s.body)).toEqual([
			{ metadata: AGENT_METADATA, spec: { policyId: "pol-search", key: AGENT_KEY } },
		]);
		await expect(page.getByRole("link", { name: "View policy" })).toHaveCount(0);
	});

	test("a keyless host is offered as its pool and sent first", async ({ page }) => {
		const sent = await mockAgentApi(page, { oneRequest: true });
		await nameAgentInProject(page);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page
			.getByRole("group", { name: "Pools" })
			.getByRole("button", { name: /Local pool/ })
			.click();
		await page.getByRole("tab", { name: "Models" }).click();
		await expect(page.getByRole("button", { name: /Gemma/ })).toBeVisible();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)[0]?.body.spec).toEqual({
			access: {
				everyCredential: false,
				poolIds: ["pool-local"],
				accountIds: ["acct-project"],
			},
			key: AGENT_KEY,
		});
	});

	test("a refused account returns to the access step with relay's message by the list", async ({
		page,
	}) => {
		const sent = await mockAgentApi(page, {
			oneRequest: true,
			refuseOnce: {
				status: 400,
				json: {
					error: { type: "invalid_request_error", message: "account is closed" },
					pointer: "/spec/access/accountIds/0",
				},
			},
		});
		await nameAgentInProject(page);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		const accounts = page.getByRole("group", { name: "Accounts" });
		await expect(accounts).toHaveAccessibleDescription("account is closed");
		expect(submits(sent)).toHaveLength(1);

		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await expect(accounts).not.toHaveAccessibleDescription("account is closed");
	});

	test("a plan issue shows under the refusal heading on its step", async ({ page }) => {
		await mockAgentApi(page, {
			oneRequest: true,
			refuseOnce: {
				status: 422,
				json: {
					error: { type: "invalid_request_error", code: "plan_issue", message: "plan issues" },
					issues: [
						{
							code: "policy_serves_nothing",
							kind: "policy",
							message: "The policy serves no model.",
							pointer: "/spec/access",
						},
						{ code: "budget_unpriced", kind: "budget" },
					],
				},
			},
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		const refused = page.getByRole("alert").filter({ hasText: "Relay would refuse this setup" });
		await expect(refused.getByRole("listitem")).toHaveText([
			"The policy serves no model.",
			"A row you can't see blocks this.",
		]);
		await expect(page.getByRole("switch", { name: "Use every credential in scope" })).toBeVisible();
	});

	test("a plan issue on the policy shows on the step with the policy select", async ({
		page,
	}) => {
		await mockAgentApi(page, {
			oneRequest: true,
			refuseOnce: {
				status: 422,
				json: {
					error: { type: "invalid_request_error", code: "plan_issue", message: "plan issues" },
					issues: [
						{
							code: "policy_disabled",
							kind: "policy",
							message: "The policy is disabled.",
							pointer: "/spec/policyId",
						},
					],
				},
			},
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Use a policy" }).click();
		await page.getByRole("combobox", { name: "Policy" }).click();
		await page.getByRole("option", { name: "Search default" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(
			page.getByRole("alert").filter({ hasText: "Relay would refuse this setup" }),
		).toContainText("The policy is disabled.");
		await expect(page.getByRole("combobox", { name: "Policy" })).toBeVisible();
	});

	test("a missing owner returns to the agent step with the message by the project", async ({
		page,
	}) => {
		await mockAgentApi(page, {
			oneRequest: true,
			refuseOnce: {
				status: 400,
				json: {
					error: { type: "invalid_request_error", message: "metadata.owner is required" },
					pointer: "/metadata/owner",
				},
			},
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByPlaceholder("Support triage agent")).toBeVisible();
		await expect(page.getByText("metadata.owner is required")).toBeVisible();
	});

	test("a busy relay asks to retry, for the dry run and the create alike", async ({ page }) => {
		const busy = {
			status: 503,
			json: {
				error: { type: "server_error", message: "a check is already running" },
				pointer: "/spec/access/accountIds/0",
			},
		};
		const sent = await mockAgentApi(page, {
			oneRequest: true,
			refuseOnce: busy,
			refuseDryRunOnce: busy,
		});
		await nameAgentInProject(page);
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByRole("alert")).toHaveText("Relay is busy. Try again in a moment.");

		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByRole("alert")).toHaveText("Relay is busy. Try again in a moment.");
		await expect(page.getByRole("button", { name: "Create agent" })).toBeEnabled();

		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)).toHaveLength(2);
	});
});

const ALL_OWNERS = ["project", "team", "user"];
const ME = "test-user";

/** The default workspace here is Personal, so the form starts on the Personal card. */
async function nameAgent(page: Page) {
	await page.goto("/service-accounts/add-agent");
	await page.getByPlaceholder("Support triage agent").fill("Indexer");
}

async function pickTeam(page: Page) {
	await page.getByRole("group", { name: "Owner" }).getByRole("button", { name: /^Team/ }).click();
	await page.getByText("Pick a team…").click();
	await page.getByRole("option", { name: "Platform" }).click();
}

test.describe("Add agent owned by a team or a user", () => {
	test("Team and Personal stay unavailable while relay takes projects only", async ({ page }) => {
		await mockAgentApi(page, { oneRequest: true, ownerKinds: ["project"] });
		await page.goto("/service-accounts/add-agent");
		const owner = page.getByRole("group", { name: "Owner" });
		await expect(owner.getByRole("button", { name: /^Project/, pressed: true })).toBeVisible();
		for (const kind of [/^Personal/, /^Team/]) {
			const card = owner.getByRole("button", { name: kind });
			await expect(card).toHaveAttribute("aria-disabled", "true");
			await expect(card).toContainText("Relay places agents in projects only.");
		}
	});

	test("Personal in one request names the caller as owner and reads the user's pickers", async ({
		page,
	}) => {
		const usableBy: string[] = [];
		const sent = await mockAgentApi(page, { oneRequest: true, ownerKinds: ALL_OWNERS, usableBy });
		await nameAgent(page);
		const owner = page.getByRole("group", { name: "Owner" });
		await expect(owner.getByRole("button", { name: /^Personal/, pressed: true })).toBeVisible();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)[0]?.body).toEqual({
			metadata: { ...AGENT_METADATA, owner: { kind: "user", id: ME } },
			spec: { access: { everyCredential: true }, key: AGENT_KEY },
		});
		expect(new Set(usableBy)).toEqual(
			new Set([`accounts user:${ME}`, `pools user:${ME}`, `policies user:${ME}`]),
		);
	});

	test("Team in one request names the team as owner and reads the team's pickers", async ({
		page,
	}) => {
		const usableBy: string[] = [];
		const sent = await mockAgentApi(page, { oneRequest: true, ownerKinds: ALL_OWNERS, usableBy });
		await nameAgent(page);
		await pickTeam(page);
		usableBy.length = 0;
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)[0]?.body).toEqual({
			metadata: { ...AGENT_METADATA, owner: { kind: "team", id: TEAM } },
			spec: {
				access: { everyCredential: false, accountIds: ["acct-project"] },
				key: AGENT_KEY,
			},
		});
		expect(usableBy.length).toBeGreaterThan(0);
		for (const read of usableBy) expect(read).toMatch(new RegExp(` team:${TEAM}$`));
	});

	test("Personal on the chain makes a user-owned service account with no project", async ({
		page,
	}) => {
		const sent = await mockAgentApi(page, { ownerKinds: ALL_OWNERS });
		await nameAgent(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST service-accounts",
			"POST accounts/acct-mine/shares",
			"POST pools",
			"POST policies",
			"PUT accounts/acct-lane/policy",
			"POST keys",
		]);
		const me = { kind: "user", id: ME };
		expect(sent[0]?.body.metadata).toMatchObject({ owner: me });
		expect(sent[0]?.body.spec).toEqual({ enabled: true });
		expect(sent[1]?.body).toEqual({ receiver: me });
		expect(sent[2]?.body.metadata).toMatchObject({ owner: me });
		expect(sent[3]?.body.metadata).toMatchObject({ owner: me });
	});

	test("Team on the chain makes the service account, share, pool and policy in the team", async ({
		page,
	}) => {
		const sent = await mockAgentApi(page, { ownerKinds: ALL_OWNERS });
		await nameAgent(page);
		await pickTeam(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Search Anthropic/ }).click();
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		const team = { kind: "team", id: TEAM };
		expect(sent.map((s) => s.path)).toEqual([
			"service-accounts",
			"accounts/acct-mine/shares",
			"pools",
			"policies",
			"accounts/acct-lane/policy",
			"keys",
		]);
		expect(sent[0]?.body.metadata).toMatchObject({ owner: team });
		expect(sent[0]?.body.spec).toEqual({ enabled: true });
		expect(sent[1]?.body).toEqual({ receiver: team });
		expect(sent[2]?.body.metadata).toMatchObject({ owner: team });
		expect(sent[3]?.body.metadata).toMatchObject({ owner: team });
	});

	test("personal accounts off: relay's refusal turns Personal off and keeps the form from it", async ({
		page,
	}) => {
		const sent = await mockAgentApi(page, {
			oneRequest: true,
			ownerKinds: ALL_OWNERS,
			refuseDryRunOnce: {
				status: 403,
				json: {
					error: {
						type: "permission_error",
						code: "personal_account_off",
						message: "personal accounts are turned off for test",
					},
					pointer: "/spec/key",
				},
			},
		});
		await nameAgent(page);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Personal accounts are off on this relay.")).toBeVisible();

		await page.getByRole("button", { name: "Create agent" }).click();
		const personal = page.getByRole("group", { name: "Owner" }).getByRole("button", { name: /^Personal/ });
		await expect(personal).toHaveAttribute("aria-disabled", "true");
		await expect(personal).toContainText("Personal accounts are off on this relay.");
		await expect(page.getByText("Pick another owner for the agent.")).toBeVisible();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByPlaceholder("Support triage agent")).toBeVisible();
		expect(submits(sent)).toHaveLength(0);

		await pickTeam(page);
		await expect(page.getByText("Pick another owner for the agent.")).toHaveCount(0);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(submits(sent)[0]?.body.metadata).toMatchObject({ owner: { kind: "team", id: TEAM } });
	});

	test("personal accounts off up front: Personal is unavailable and the form starts on Project", async ({
		page,
	}) => {
		await mockAgentApi(page, {
			oneRequest: true,
			ownerKinds: ALL_OWNERS,
			personalAccountEffective: { state: "off", source: "user" },
		});
		await page.goto("/service-accounts/add-agent");
		const owner = page.getByRole("group", { name: "Owner" });
		const personal = owner.getByRole("button", { name: /^Personal/ });
		await expect(personal).toHaveAttribute("aria-disabled", "true");
		await expect(personal).toContainText("Personal accounts are off on this relay.");
		await expect(owner.getByRole("button", { name: /^Project/, pressed: true })).toBeVisible();
		await expect(owner.getByRole("button", { name: /^Team/ })).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});
});
