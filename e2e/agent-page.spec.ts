import { expect, type Locator, type Page, test } from "@playwright/test";
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

const KEYLESS_HOST = "host-local";
const hosts = [
	{ metadata: { id: HOST, name: "anthropic" }, spec: { baseURL: "https://anthropic.test" } },
	{
		metadata: { id: KEYLESS_HOST, name: "local" },
		spec: { baseURL: "http://local.test", noAuth: true },
	},
];
const localPool = {
	metadata: { id: "pool-local", name: "pool-local", displayName: "Local pool" },
	spec: { hostId: KEYLESS_HOST, accountIds: [] },
};
/** The source policy linking a keyless host's pool beside its own. */
const keylessOwnPolicy = {
	...ownPolicy,
	spec: { ...ownPolicy.spec, poolIds: ["pool-a", "pool-local"] },
};

/** Relay's answer to `POST /pseudo-agents`, the plaintext unless a dry run. */
function pseudoAnswer(dryRun: boolean) {
	return {
		created: [
			{ kind: "service-account", id: NEW_AGENT, name: "indexer-copy" },
			{ kind: "policy", id: "policy-1", name: "indexer-copy-policy" },
			{ kind: "key", id: "key-1", name: "indexer-copy-key" },
		],
		serviceAccount: { id: NEW_AGENT, name: "indexer-copy" },
		account: { id: "acct-new-lane", name: "acct-new-lane" },
		policy: { id: "policy-1", name: "indexer-copy-policy" },
		pools: [],
		shares: [],
		key: {
			id: "key-1",
			name: "indexer-copy-key",
			...(dryRun ? {} : { plaintext: "sk-wr-test-secret" }),
		},
	};
}
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

interface Answer {
	status: number;
	json: object;
}

type RemovalBody = { spec: { serviceAccountId: string; keep?: string[]; expect?: string[] } };

/** The Nth removal request (from 0, dry runs included); undefined answers {@link removalAnswer}. */
type RemovalResponder = (body: RemovalBody, dryRun: boolean, n: number) => Answer | undefined;

interface AgentPageMock {
	/** A write refused the first time. */
	failOnce?: FailOnce;
	/** Serves `pseudoKinds: ["agents"]`, a keyless host, and the source policy linking its pool. */
	oneRequest?: boolean;
	/** Serves `pseudoKinds: ["agent-removals"]`; answers `POST /pseudo-agent-removals`. */
	removal?: RemovalResponder;
}

const REMOVAL_DELETED = [
	{ kind: "key", id: "k1", name: "indexer-key-k1" },
	{ kind: "key", id: "k2", name: "indexer-key-k2" },
	{ kind: "policy-binding", id: "pb-src", name: "pb-src" },
	{ kind: "service-account", id: AGENT, name: "indexer-1234" },
	{ kind: "account", id: "acct-src-lane", name: "acct-src-lane" },
	{ kind: "policy", id: "pol-src", name: "indexer-policy" },
	{ kind: "pool", id: "pool-a", name: "indexer-pool" },
	{ kind: "pool", id: "pool-b", name: "indexer-spare-pool" },
];
const REMOVAL_IDS = REMOVAL_DELETED.map((row) => row.id);
const SHARED_KEPT = [
	{ kind: "policy", id: "pol-shared", name: "indexer-extra", reason: "in_use" },
	{ kind: "pool", id: "pool-extra", name: "indexer-extra-pool", reason: "in_use" },
];

/** Relay's removal answer for a keep list: a kept policy keeps the pools it links. */
function removalAnswer(keep: readonly string[] = [], warnings: object[] = []) {
	const linked = keep.includes("pol-src") ? ["pool-a", "pool-b"] : [];
	return {
		deleted: REMOVAL_DELETED.filter((row) => !keep.includes(row.id) && !linked.includes(row.id)),
		kept: [
			...SHARED_KEPT,
			...REMOVAL_DELETED.filter((row) => keep.includes(row.id)).map((row) => ({
				...row,
				reason: "kept_by_request",
			})),
			...REMOVAL_DELETED.filter((row) => linked.includes(row.id)).map((row) => ({
				...row,
				reason: "in_use",
			})),
		],
		updated: [],
		warnings,
	};
}

/** Answers the agent page's reads and records its writes; a dry run is recorded as `pseudo-agents?dryRun`. */
async function mockAgentPage(
	page: Page,
	features: Record<string, boolean>,
	{ failOnce, oneRequest, removal }: AgentPageMock = {},
): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	let removals = 0;
	const sourcePolicy = oneRequest ? keylessOwnPolicy : ownPolicy;
	const servedPools = oneRequest ? [...pools, localPool] : pools;
	await mockApi(page, {
		...EMPTY_GRAPH,
		contexts,
		features,
		serviceAccounts: [agent, plain],
		accounts,
		keys,
		policies: [sourcePolicy, sharedPolicy],
		policyBindings: bindings,
		...(oneRequest ? { pseudoKinds: ["agents"], hosts } : {}),
		...(removal ? { pseudoKinds: ["agent-removals"] } : {}),
	});
	await page.route("**/api/catalog/graph**", (route) => route.fulfill({ json: catalog }));
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			if (path === "projects") return route.fulfill({ json: { items: projects, total: 1 } });
			if (path === "pools") {
				return route.fulfill({ json: { items: servedPools, total: servedPools.length } });
			}
			if (path === "policies" && url.searchParams.getAll("label").includes(LABEL)) {
				return route.fulfill({ json: { items: [sourcePolicy, sharedPolicy], total: 2 } });
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
		if (path === "pseudo-agents") {
			const dryRun = url.searchParams.get("dryRun") === "true";
			sent.push({ method, path: dryRun ? "pseudo-agents?dryRun" : path, body });
			return route.fulfill({ status: dryRun ? 200 : 201, json: pseudoAnswer(dryRun) });
		}
		if (path === "pseudo-agent-removals" && removal) {
			const dryRun = url.searchParams.get("dryRun") === "true";
			sent.push({ method, path: dryRun ? `${path}?dryRun` : path, body });
			const removalBody: RemovalBody = request.postDataJSON();
			const answer = removal(removalBody, dryRun, removals++) ?? {
				status: 200,
				json: removalAnswer(removalBody.spec.keep),
			};
			return route.fulfill(answer);
		}
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

const removalList = (dialog: Locator) =>
	dialog.getByRole("list", { name: "Deleted, in this order" });
const madeForAgent = (dialog: Locator) => dialog.getByRole("group", { name: "Made for this agent" });

async function openOneRequestRemoval(page: Page) {
	await openPage(page, "indexer-1234");
	await actions(page).remove.click();
	const dialog = page.getByRole("dialog");
	await expect(removalList(dialog).getByRole("listitem").first()).toBeVisible();
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
			failOnce: {
				method: "DELETE",
				path: "service-accounts/by-id/sa-src",
				message: "service account is referenced",
			},
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

	test("Add an agent like this ticks the agent's keyless pool and sends it in one request", async ({
		page,
	}) => {
		const sent = await mockAgentPage(page, FLAGS, { oneRequest: true });
		await openPage(page, "indexer-1234");
		await actions(page).copy.click();

		await expect(page.getByPlaceholder("Support triage agent")).toHaveValue("Indexer copy");
		await page.getByRole("button", { name: "Next" }).click();
		await expect(
			page.getByRole("group", { name: "Pools" }).getByRole("button", { name: /Local pool/ }),
		).toHaveAttribute("aria-pressed", "true");

		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Create agent" }).click();
		await expect(page.getByText("sk-wr-test-secret", { exact: true })).toBeVisible();
		const creates = sent.filter((s) => s.path === "pseudo-agents");
		expect(creates).toHaveLength(1);
		expect(creates[0]?.body.spec).toMatchObject({
			access: {
				everyCredential: false,
				poolIds: ["pool-local"],
				accountIds: ["acct-project"],
				models: ["anthropic/claude-sonnet"],
			},
		});
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

	test("Remove agent sends one request with relay's list as expect", async ({ page }) => {
		const warning = "Policy rig-default would link a pool with no account.";
		const sent = await mockAgentPage(page, FLAGS, {
			removal: (body, dryRun) =>
				dryRun ? { status: 200, json: removalAnswer(body.spec.keep, [{ code: "w", message: warning }]) } : undefined,
		});
		const dialog = await openOneRequestRemoval(page);
		await expect(removalList(dialog).getByRole("listitem")).toHaveText([
			/^Key\s*indexer-key-k1$/,
			/^Key\s*indexer-key-k2$/,
			/^Policy binding\s*pb-src$/,
			/^Service account\s*indexer-1234$/,
			/^Account\s*acct-src-lane$/,
			/^Policy\s*indexer-policy$/,
			/^Pool\s*indexer-pool$/,
			/^Pool\s*indexer-spare-pool$/,
		]);
		await expect(madeForAgent(dialog).getByRole("button")).toHaveText([
			/^Policy indexer-extra\s*Kept: used by something else$/,
			/^Policy indexer-policy$/,
			/^Pool indexer-extra-pool\s*Kept: used by something else$/,
			/^Pool indexer-pool$/,
			/^Pool indexer-spare-pool$/,
		]);
		await expect(dialog.getByRole("button", { name: /^Policy indexer-extra/ })).toBeDisabled();
		await expect(
			dialog.getByRole("status").filter({ hasText: "Relay will accept this, with warnings" }),
		).toContainText(warning);

		const remove = dialog.getByRole("button", { name: "Remove agent" });
		await expect(remove).toBeDisabled();
		await dialog.getByRole("textbox").fill("indexer-1234");
		await remove.click();

		await expect(page).toHaveURL(LIST_URL);
		await expect(page.getByText('Agent "Indexer" removed.')).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST pseudo-agent-removals?dryRun",
			"POST pseudo-agent-removals",
		]);
		expect(sent[0]?.body).toEqual({ spec: { serviceAccountId: AGENT } });
		expect(sent[1]?.body).toEqual({ spec: { serviceAccountId: AGENT, expect: REMOVAL_IDS } });
	});

	test("Remove agent: unticking the policy asks again and keeps what it links", async ({
		page,
	}) => {
		const sent = await mockAgentPage(page, FLAGS, { removal: () => undefined });
		const dialog = await openOneRequestRemoval(page);
		await dialog.getByRole("button", { name: /^Policy indexer-policy/ }).click();

		await expect(removalList(dialog).getByRole("listitem")).toHaveCount(5);
		await expect(dialog.getByRole("button", { name: /^Policy indexer-policy/ })).toHaveText(
			/Kept$/,
		);
		await expect(dialog.getByRole("button", { name: /^Pool indexer-pool/ })).toHaveText(
			/Kept: used by something else$/,
		);
		await dialog.getByRole("textbox").fill("indexer-1234");
		await dialog.getByRole("button", { name: "Remove agent" }).click();

		await expect(page).toHaveURL(LIST_URL);
		expect(sent.map((s) => s.body)).toEqual([
			{ spec: { serviceAccountId: AGENT } },
			{ spec: { serviceAccountId: AGENT, keep: ["pol-src"] } },
			{
				spec: {
					serviceAccountId: AGENT,
					keep: ["pol-src"],
					expect: ["k1", "k2", "pb-src", AGENT, "acct-src-lane"],
				},
			},
		]);
	});

	test("Remove agent: a set that changed shows relay's new list and asks for the name again", async ({
		page,
	}) => {
		const added = { kind: "key", id: "k3", name: "indexer-key-k3" };
		const sent = await mockAgentPage(page, FLAGS, {
			removal: (_body, dryRun, n) => {
				if (dryRun || n > 1) return undefined;
				const now = removalAnswer();
				return {
					status: 409,
					json: {
						error: { type: "invalid_request_error", code: "changed", message: "the set changed" },
						pointer: "/spec/expect",
						deleted: [added, ...now.deleted],
						kept: now.kept,
					},
				};
			},
		});
		const dialog = await openOneRequestRemoval(page);
		const remove = dialog.getByRole("button", { name: "Remove agent" });
		await dialog.getByRole("textbox").fill("indexer-1234");
		await remove.click();

		await expect(
			dialog.getByText("This changed while the dialog was open. Check the list again."),
		).toBeVisible();
		await expect(removalList(dialog).getByRole("listitem").first()).toHaveText(
			/^Key\s*indexer-key-k3$/,
		);
		await expect(dialog.getByRole("textbox")).toHaveValue("");
		await expect(remove).toBeDisabled();

		await dialog.getByRole("textbox").fill("indexer-1234");
		await remove.click();
		await expect(page).toHaveURL(LIST_URL);
		expect(sent.map((s) => s.path)).toEqual([
			"pseudo-agent-removals?dryRun",
			"pseudo-agent-removals",
			"pseudo-agent-removals",
		]);
		expect(sent[2]?.body).toEqual({
			spec: { serviceAccountId: AGENT, expect: ["k3", ...REMOVAL_IDS] },
		});
	});

	test("Remove agent: an untick relay refuses shows its message by the row", async ({ page }) => {
		await mockAgentPage(page, FLAGS, {
			removal: (body) =>
				body.spec.keep
					? {
							status: 400,
							json: {
								error: { type: "invalid_request_error", message: "pool-b can't be kept" },
								pointer: "/spec/keep/0",
							},
						}
					: undefined,
		});
		const dialog = await openOneRequestRemoval(page);
		await dialog.getByRole("button", { name: /^Pool indexer-spare-pool/ }).click();

		const row = madeForAgent(dialog).getByRole("listitem").filter({ hasText: "indexer-spare-pool" });
		await expect(row).toContainText("pool-b can't be kept");
		await dialog.getByRole("textbox").fill("indexer-1234");
		await expect(dialog.getByRole("button", { name: "Remove agent" })).toBeDisabled();
	});

	test("Remove agent: a plan issue lists relay's issues", async ({ page }) => {
		await mockAgentPage(page, FLAGS, {
			removal: (_body, dryRun) =>
				dryRun
					? undefined
					: {
							status: 422,
							json: {
								error: { type: "invalid_request_error", code: "plan_issue", message: "plan issues" },
								issues: [{ code: "dead_ref", kind: "policy", message: "Policy x would name a deleted pool." }],
							},
						},
		});
		const dialog = await openOneRequestRemoval(page);
		await dialog.getByRole("textbox").fill("indexer-1234");
		await dialog.getByRole("button", { name: "Remove agent" }).click();

		const refused = dialog.getByRole("alert").filter({ hasText: "Relay would refuse this setup" });
		await expect(refused.getByRole("listitem")).toHaveText(["Policy x would name a deleted pool."]);
		await expect(dialog.getByRole("button", { name: "Remove agent" })).toBeDisabled();
	});

	test("Remove agent: a delete still referenced shows its blockers", async ({ page }) => {
		await mockAgentPage(page, FLAGS, {
			removal: (_body, dryRun) =>
				dryRun
					? undefined
					: {
							status: 409,
							json: {
								error: {
									type: "invalid_request_error",
									code: "resource_in_use",
									message: "service account is referenced",
								},
								pointer: "/spec/serviceAccountId",
								blockers: [
									{
										kind: "role-binding",
										field: "spec.subjects",
										count: 1,
										hidden: 0,
										detachable: false,
										items: [{ id: "rb-1", name: "indexer-reader" }],
									},
								],
							},
						},
		});
		const dialog = await openOneRequestRemoval(page);
		await dialog.getByRole("textbox").fill("indexer-1234");
		await dialog.getByRole("button", { name: "Remove agent" }).click();

		await expect(dialog.getByText("Still in use")).toBeVisible();
		await expect(dialog.getByText("indexer-reader")).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Remove agent" })).toBeDisabled();
	});

	test("Remove agent: a busy relay asks to try again", async ({ page }) => {
		const sent = await mockAgentPage(page, FLAGS, {
			removal: (_body, dryRun, n) =>
				dryRun || n > 1
					? undefined
					: {
							status: 503,
							json: { error: { type: "api_error", message: "plans not loaded" } },
						},
		});
		const dialog = await openOneRequestRemoval(page);
		await dialog.getByRole("textbox").fill("indexer-1234");
		const remove = dialog.getByRole("button", { name: "Remove agent" });
		await remove.click();

		await expect(dialog.getByText("Relay is busy. Try again in a moment.")).toBeVisible();
		await remove.click();
		await expect(page).toHaveURL(LIST_URL);
		expect(sent.filter((s) => s.path === "pseudo-agent-removals")).toHaveLength(2);
	});

	test("the key form ignores a preset while the flag is off", async ({ page }) => {
		await mockAgentPage(page, {});
		await page.goto(`/keys/new?principal=${AGENT}&project=${PROJECT}`);
		await expect(page.getByText("Pick a project…")).toBeVisible(FIRST_RENDER);
		await expect(page).not.toHaveURL(/principal=/);
	});
});
