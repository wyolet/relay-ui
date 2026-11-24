import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const HOST = "host-anthropic";
const AGENT = "sa-src";
const NEW_AGENT = "sa-new";
const LABEL = `agent-id=${AGENT}`;

const FLAGS = {
	shortcutRemoveAgent: true,
	shortcutCopyAgent: true,
	shortcutAgentKey: true,
};

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

const projects = [
	{
		metadata: { id: PROJECT, name: "search", displayName: "Search" },
		spec: { teamId: TEAM },
	},
];

const catalog = {
	providers: [{ id: "prov-anthropic", name: "anthropic", displayName: "Anthropic" }],
	hosts: [{ id: HOST, name: "anthropic", displayName: "Anthropic" }],
	models: [
		{
			id: "m-sonnet",
			name: "claude-sonnet",
			displayName: "Claude Sonnet",
			providerId: "prov-anthropic",
			bindings: [{ hostId: HOST }],
		},
	],
};

const serviceAccount = (id: string, name: string, displayName: string, labels?: object) => ({
	metadata: { id, name, displayName, ...(labels ? { labels } : {}) },
	spec: { projectId: PROJECT, enabled: true },
});
const agent = serviceAccount(AGENT, "indexer-1234", "Indexer", { "sa-type": "agent" });
const plain = serviceAccount("sa-ci", "ci-bot", "CI bot");

const lane = (id: string, holder: string) => ({
	metadata: { id, name: id, owner: { kind: "project", id: PROJECT } },
	spec: { kind: "service", holder: { kind: "serviceaccount", id: holder } },
});
const providerAccount = (id: string, displayName: string, owner: object) => ({
	metadata: { id, name: id, displayName, owner },
	spec: { kind: "provider", hostId: HOST },
});
const projectAccount = providerAccount("acct-project", "Search Anthropic", {
	kind: "project",
	id: PROJECT,
});
const myAccount = providerAccount("acct-mine", "My Anthropic", {
	kind: "user",
	id: "test-user",
});
const accounts = [lane("acct-src-lane", AGENT), lane("acct-new-lane", NEW_AGENT), projectAccount, myAccount];

const keys = ["k1", "k2"].map((id) => ({
	metadata: { id, name: `indexer-key-${id}` },
	spec: { principal: { kind: "serviceaccount", id: AGENT }, keyHash: `hash-${id}` },
}));

const labelled = { "agent-id": AGENT };
const ownPolicy = {
	metadata: { id: "pol-src", name: "indexer-policy", displayName: "Indexer policy", labels: labelled },
	spec: { poolIds: ["pool-a", "pool-b"], models: ["anthropic/claude-sonnet"] },
};
/** Made for the agent, then bound to another account. */
const sharedPolicy = {
	metadata: { id: "pol-shared", name: "indexer-extra", displayName: "Indexer extra", labels: labelled },
	spec: { poolIds: ["pool-extra"] },
};
const pool = (id: string, displayName: string, accountIds: string[]) => ({
	metadata: { id, name: id, displayName, labels: labelled },
	spec: { hostId: HOST, accountIds },
});
const pools = [
	pool("pool-a", "Indexer pool", ["acct-project"]),
	pool("pool-b", "Indexer spare pool", ["acct-project"]),
	pool("pool-extra", "Indexer extra pool", ["acct-project"]),
];
const bindings = [
	{
		metadata: { id: "pb-src", name: "pb-src" },
		spec: { policyId: "pol-src", accountIds: ["acct-src-lane"] },
	},
	{
		metadata: { id: "pb-other", name: "pb-other" },
		spec: { policyId: "pol-shared", accountIds: ["acct-other"] },
	},
];

interface Sent {
	method: string;
	path: string;
	body: Record<string, unknown>;
}

interface FailOnce {
	method: string;
	path: string;
	message: string;
}

/** Answers the agent page's reads and records its writes; `failOnce` names a write refused the first time. */
async function mockAgentPage(
	page: Page,
	features: Record<string, boolean>,
	failOnce?: FailOnce,
): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	await mockApi(page, {
		...EMPTY_GRAPH,
		contexts,
		features,
		serviceAccounts: [agent, plain],
		accounts,
		keys,
		policies: [ownPolicy, sharedPolicy],
		policyBindings: bindings,
	});
	await page.route("**/api/catalog/graph**", (route) => route.fulfill({ json: catalog }));
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			if (path === "projects") return route.fulfill({ json: { items: projects, total: 1 } });
			if (path === "pools") return route.fulfill({ json: { items: pools, total: pools.length } });
			if (path === "policies" && url.searchParams.getAll("label").includes(LABEL)) {
				return route.fulfill({ json: { items: [ownPolicy, sharedPolicy], total: 2 } });
			}
			if (path === "keys" && url.searchParams.getAll("principal_id").includes(AGENT)) {
				return route.fulfill({ json: { items: keys, total: keys.length } });
			}
			if (path === "accounts" && url.searchParams.has("usable_by")) {
				return route.fulfill({ json: { items: [projectAccount], total: 1 } });
			}
			return route.fallback();
		}
		if (failOnce && failOnce.method === method && failOnce.path === path && !failed) {
			failed = true;
			return route.fulfill({
				status: 409,
				json: { error: { type: "invalid_request_error", message: failOnce.message } },
			});
		}
		const body = request.postDataJSON() ?? {};
		sent.push({ method, path, body });
		if (method === "DELETE") return route.fulfill({ status: 204 });
		const id = `made-${sent.length}`;
		if (path === "service-accounts") {
			return route.fulfill({ json: { ...body, metadata: { ...body.metadata, id: NEW_AGENT } } });
		}
		if (path === "keys") {
			return route.fulfill({
				json: {
					plaintext: "sk-wr-test-secret",
					key: { metadata: { id, name: "new-key" }, spec: body.spec },
				},
			});
		}
		if (path.endsWith("/policy")) return route.fulfill({ json: { previousBindingDeleted: true } });
		return route.fulfill({ json: { ...body, metadata: { ...body.metadata, id, name: id } } });
	});
	return sent;
}

const actions = (page: Page) => ({
	newKey: page.getByRole("link", { name: "New key" }),
	copy: page.getByRole("link", { name: "Add an agent like this" }),
	remove: page.getByRole("button", { name: "Remove agent" }),
});

const LIST_URL = /\/service-accounts(\?|$)/;

const REMOVAL = [
	"DELETE keys/by-id/k1",
	"DELETE keys/by-id/k2",
	"PUT accounts/acct-src-lane/policy",
	"DELETE service-accounts/by-id/sa-src",
	"DELETE policies/by-id/pol-src",
	"DELETE pools/by-id/pool-a",
	"DELETE pools/by-id/pool-b",
];

/** A cold dev server under parallel workers can take this long to serve a page's first render. */
const FIRST_RENDER = { timeout: 20_000 };

async function openPage(page: Page, name: string) {
	await page.goto(`/service-accounts/${name}`);
	await expect(page.getByRole("button", { name: "Delete" })).toBeVisible(FIRST_RENDER);
}

async function openRemoval(page: Page) {
	await openPage(page, "indexer-1234");
	await actions(page).remove.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByText("Delete service account Indexer")).toBeVisible();
	return dialog;
}

test.describe("Agent page shortcuts", () => {
	test("each action is absent while its flag is off", async ({ page }) => {
		await mockAgentPage(page, {});
		await openPage(page, "indexer-1234");
		const { newKey, copy, remove } = actions(page);
		for (const action of [newKey, copy, remove]) await expect(action).toHaveCount(0);
	});

	test("each action shows with its flag on; Remove agent only on an agent", async ({ page }) => {
		await mockAgentPage(page, FLAGS);
		await openPage(page, "indexer-1234");
		const { newKey, copy, remove } = actions(page);
		for (const action of [newKey, copy, remove]) await expect(action).toBeVisible();

		await openPage(page, "ci-bot");
		await expect(newKey).toBeVisible();
		await expect(copy).toBeVisible();
		await expect(remove).toHaveCount(0);
	});

	test("Remove agent deletes in order and keeps a policy another account uses", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS);
		const dialog = await openRemoval(page);
		await expect(dialog.getByRole("listitem")).toHaveText([
			"Delete key indexer-key-k1",
			"Delete key indexer-key-k2",
			"Take the agent off policy Indexer policy",
			"Delete service account Indexer",
			"Delete policy Indexer policy",
			"Delete pool Indexer pool",
			"Delete pool Indexer spare pool",
			/Policy Indexer policy/,
			/Policy Indexer extra.*Kept: used by 1 other account/,
			/Pool Indexer pool/,
			/Pool Indexer spare pool/,
			/Pool Indexer extra pool.*Kept: linked by policy Indexer extra/,
		]);

		const remove = dialog.getByRole("button", { name: "Remove agent" });
		await expect(remove).toBeDisabled();
		await dialog.getByRole("textbox").fill("indexer-1234");
		await remove.click();

		await expect(page).toHaveURL(LIST_URL);
		await expect(page.getByText('Agent "Indexer" removed.')).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(REMOVAL);
		expect(sent[2]?.body).toEqual({ policyId: null });
	});

	test("an unticked pool stays", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS);
		const dialog = await openRemoval(page);
		await dialog.getByRole("button", { name: /^Pool Indexer spare pool/ }).click();
		await expect(dialog.getByText("Delete pool Indexer spare pool")).toHaveCount(0);
		await dialog.getByRole("textbox").fill("indexer-1234");
		await dialog.getByRole("button", { name: "Remove agent" }).click();

		await expect(page).toHaveURL(LIST_URL);
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(
			REMOVAL.filter((r) => r !== "DELETE pools/by-id/pool-b"),
		);
	});

	test("a refused delete stops the run and Retry resumes at it", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS, {
			method: "DELETE",
			path: "service-accounts/by-id/sa-src",
			message: "service account is referenced",
		});
		const dialog = await openRemoval(page);
		await dialog.getByRole("textbox").fill("indexer-1234");
		await dialog.getByRole("button", { name: "Remove agent" }).click();

		await expect(dialog.getByText("service account is referenced")).toBeVisible();
		await expect(dialog.getByText("3 of 7 steps are done and kept.")).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(REMOVAL.slice(0, 3));

		await dialog.getByRole("button", { name: "Retry" }).click();
		await expect(page).toHaveURL(LIST_URL);
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(REMOVAL);
	});

	test("Add an agent like this starts the form on the agent's setup", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS);
		await openPage(page, "indexer-1234");
		await actions(page).copy.click();

		await expect(page).toHaveURL(/\/service-accounts\/add-agent\?from=sa-src/);
		await expect(page.getByPlaceholder("Support triage agent")).toHaveValue("Indexer copy");
		await expect(page.getByRole("combobox", { name: "Project" })).toContainText("Search");
		await page.getByRole("button", { name: "Next" }).click();

		await expect(
			page.getByRole("switch", { name: "Use every credential in scope" }),
		).not.toBeChecked();
		await expect(page.getByRole("button", { name: /Search Anthropic/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.getByRole("button", { name: /My Anthropic/ })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(
			page.getByRole("button", { name: "Remove anthropic/claude-sonnet" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST service-accounts",
			"POST pools",
			"POST policies",
			"PUT accounts/acct-new-lane/policy",
			"POST keys",
		]);
		expect(sent[0]?.body.metadata).toMatchObject({
			displayName: "Indexer copy",
			labels: { "sa-type": "agent" },
		});
		expect(sent[0]?.body.spec).toMatchObject({ projectId: PROJECT });
		expect(sent[1]?.body.spec).toEqual({ hostId: HOST, accountIds: ["acct-project"] });
		expect(sent[2]?.body.spec).toMatchObject({
			poolIds: ["made-2"],
			models: ["anthropic/claude-sonnet"],
		});
		expect(sent[3]?.body).toEqual({ policyId: "made-3" });
	});

	test("New key opens the key form on the service account", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS);
		await openPage(page, "indexer-1234");
		await actions(page).newKey.click();

		await expect(page).toHaveURL(/\/keys\/new\?.*principal=sa-src/);
		await expect(page.getByText("Indexer", { exact: true })).toBeVisible();
		await expect(page.getByText("Search", { exact: true })).toBeVisible();
		await page.getByPlaceholder("prod-app").fill("Indexer second key");
		await page.getByRole("button", { name: /^Create/ }).click();

		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual(["POST keys"]);
		expect(sent[0]?.body.spec).toMatchObject({
			principal: { kind: "serviceaccount", id: AGENT },
		});
	});

	test("the key form ignores a preset while the flag is off", async ({ page }) => {
		await mockAgentPage(page, {});
		await page.goto(`/keys/new?principal=${AGENT}&project=${PROJECT}`);
		await expect(page.getByText("Pick a project…")).toBeVisible(FIRST_RENDER);
		await expect(page).not.toHaveURL(/principal=/);
	});
});
