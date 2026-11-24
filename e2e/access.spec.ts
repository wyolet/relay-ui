import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const ANTHROPIC = "host-anthropic";
const OLLAMA = "host-ollama";
const SET_ACCESS = `/access/set?targetKind=team&id=${TEAM}`;

const contexts = [
	{ kind: "personal", id: "test-user", name: "test", displayName: "test", admin: true },
	{ kind: "team", id: TEAM, name: "platform", displayName: "Platform", admin: true },
];

const team = {
	metadata: { id: TEAM, name: "platform", displayName: "Platform" },
	spec: { enabled: true },
};
const serviceAccount = {
	metadata: { id: "sa-1", name: "ci-bot", displayName: "CI bot" },
	spec: { projectId: PROJECT, enabled: true },
};

const hosts = [
	{
		metadata: { id: ANTHROPIC, name: "anthropic", displayName: "Anthropic" },
		spec: { baseURL: "https://api.anthropic.test", enabled: true },
	},
	{
		metadata: { id: OLLAMA, name: "ollama", displayName: "Ollama" },
		spec: { baseURL: "http://ollama.test", enabled: true, noAuth: true },
	},
];

const catalog = {
	providers: [
		{ id: "prov-anthropic", name: "anthropic", displayName: "Anthropic" },
		{ id: "prov-google", name: "google", displayName: "Google" },
	],
	hosts: [
		{ id: ANTHROPIC, name: "anthropic", displayName: "Anthropic" },
		{ id: OLLAMA, name: "ollama", displayName: "Ollama" },
	],
	models: [
		{
			id: "m-sonnet",
			name: "claude-sonnet",
			displayName: "Claude Sonnet",
			providerId: "prov-anthropic",
			bindings: [{ hostId: ANTHROPIC }],
		},
		{
			id: "m-gemma",
			name: "gemma",
			displayName: "Gemma",
			providerId: "prov-google",
			bindings: [{ hostId: OLLAMA }],
		},
	],
};

const teamAccount = {
	metadata: { id: "acct-team", name: "team-platform", owner: { kind: "team", id: TEAM } },
	spec: { kind: "team" },
};
const laneAccount = {
	metadata: { id: "acct-lane", name: "sa-ci-bot", owner: { kind: "project", id: PROJECT } },
	spec: { kind: "service", holder: { kind: "serviceaccount", id: "sa-1" } },
};

function providerAccount(id: string, displayName: string, owner: object, hostId = ANTHROPIC) {
	return {
		metadata: { id, name: id, displayName, owner },
		spec: { kind: "provider", hostId },
	};
}

const teamAnthropic = providerAccount("acct-anthropic", "Platform Anthropic", {
	kind: "team",
	id: TEAM,
});
const teamOllama = providerAccount(
	"acct-ollama",
	"Platform Ollama",
	{ kind: "team", id: TEAM },
	OLLAMA,
);
const myAnthropic = providerAccount("acct-mine", "My Anthropic", {
	kind: "user",
	id: "test-user",
});

function policy(id: string, displayName: string, owner: object, spec: object) {
	return { metadata: { id, name: id, displayName, owner, resourceVersion: "7" }, spec };
}

function binding(policyId: string, accountIds: string[]) {
	return {
		metadata: { id: `b-${policyId}`, name: `b-${policyId}` },
		spec: { policyId, accountIds },
	};
}

function pool(id: string, displayName: string, spec: object) {
	return { metadata: { id, name: id, displayName }, spec };
}

interface Sent {
	method: string;
	path: string;
	body: Record<string, unknown>;
}

interface Setup {
	policies?: ReturnType<typeof policy>[];
	bindings?: ReturnType<typeof binding>[];
	pools?: ReturnType<typeof pool>[];
	features?: Record<string, boolean>;
	/** A write path that fails the first time. */
	failOnce?: string;
}

/** Answers the form's reads and records its writes. */
async function mockAccessApi(page: Page, setup: Setup = {}): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	const policies = setup.policies ?? [];
	await mockApi(page, {
		...EMPTY_GRAPH,
		contexts,
		roles: ["admin"],
		hosts,
		policies,
		policyBindings: setup.bindings ?? [],
		serviceAccounts: [serviceAccount],
		features: setup.features ?? { shortcutAccess: true },
	});
	await page.route("**/api/catalog/graph**", (route) => route.fulfill({ json: catalog }));
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			if (path === `teams/${TEAM}`) return route.fulfill({ json: team });
			if (path === "pools") {
				const items = setup.pools ?? [];
				return route.fulfill({ json: { items, total: items.length } });
			}
			if (path !== "accounts") return route.fallback();
			const kind = url.searchParams.get("kind");
			const items =
				kind === "team"
					? [teamAccount]
					: kind === "service"
						? [laneAccount]
						: url.searchParams.has("usable_by")
							? [teamAnthropic, teamOllama]
							: [teamAnthropic, teamOllama, myAnthropic];
			return route.fulfill({ json: { items, total: items.length } });
		}
		if (setup.failOnce === path && !failed) {
			failed = true;
			return route.fulfill({
				status: 409,
				json: { error: { type: "refused", message: "policy refused" } },
			});
		}
		const body = request.postDataJSON() ?? {};
		sent.push({ method, path, body });
		const id = `made-${sent.length}`;
		if (path.endsWith("/shares")) {
			return route.fulfill({
				json: { metadata: { id: "acct-share", name: "acct-share" }, spec: {} },
			});
		}
		if (path.endsWith("/duplicate")) {
			const source = policies.find((p) => path === `policies/${p.metadata.id}/duplicate`);
			return route.fulfill({
				json: {
					metadata: { id: "copy-1", name: "copy-1", ...body },
					spec: source?.spec ?? {},
				},
			});
		}
		if (path.endsWith("/policy")) {
			return route.fulfill({ json: { binding: binding(String(body.policyId), []) } });
		}
		return route.fulfill({
			json: { ...body, metadata: { name: id, id, ...body.metadata } },
		});
	});
	return sent;
}

const writes = (sent: Sent[]) => sent.map((s) => `${s.method} ${s.path}`);

test.describe("Set access", () => {
	test("the action shows only with the flag on", async ({ page }) => {
		await mockAccessApi(page, { features: { shortcutAccess: false } });
		await page.goto("/service-accounts/ci-bot");
		await expect(page.getByRole("heading", { name: "CI bot" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Set access" })).toHaveCount(0);
		await page.goto(SET_ACCESS);
		await expect(page).not.toHaveURL(/\/access\/set/);

		await page.unrouteAll({ behavior: "ignoreErrors" });
		await mockAccessApi(page);
		await page.goto("/service-accounts/ci-bot");
		await page.getByRole("link", { name: "Set access" }).click();
		await expect(page).toHaveURL(/\/access\/set\?targetKind=serviceaccount&id=sa-1$/);
		await expect(page.getByText("No policy yet")).toBeVisible();
	});

	test("an unknown target is not found", async ({ page }) => {
		await mockAccessApi(page);
		await page.goto("/access/set?targetKind=team&id=nope");
		await expect(page.getByText(/^Not found/)).toBeVisible();
		await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute("href", /\/teams$/);
	});

	test("under no policy, nothing narrowing has nothing to save", async ({ page }) => {
		const sent = await mockAccessApi(page);
		await page.goto(SET_ACCESS);
		await expect(page.getByText("No policy yet")).toBeVisible();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("This is what Platform reaches already.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save access" })).toBeDisabled();
		expect(sent).toEqual([]);
	});

	test("create: shares, pools, makes the policy and binds it", async ({ page }) => {
		const sent = await mockAccessApi(page);
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await expect(page.getByRole("button", { name: /Platform Anthropic/ })).toBeVisible();
		await expect(page.getByRole("button", { name: /Platform Ollama/ })).toHaveCount(0);
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Pick an account, or use every credential.")).toBeVisible();

		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("Access saved")).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST accounts/acct-mine/shares",
			"POST pools",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[0]?.body).toEqual({ receiver: { kind: "team", id: TEAM } });
		expect(sent[1]?.body).toMatchObject({
			metadata: {
				displayName: "Platform Anthropic pool",
				owner: { kind: "team", id: TEAM },
				labels: { "access-for": "acct-team" },
			},
			spec: { hostId: ANTHROPIC, accountIds: ["acct-anthropic", "acct-share"] },
		});
		expect(sent[2]?.body).toMatchObject({
			metadata: { displayName: "Platform access", owner: { kind: "team", id: TEAM } },
			spec: { enabled: true, poolIds: ["made-2"], models: [] },
		});
		expect(sent[3]?.body).toEqual({ policyId: "made-3" });
		await expect(page.getByRole("link", { name: "View policy" })).toHaveAttribute(
			"href",
			/\/policies\/platform-access-\w+$/,
		);
		await expect(page.getByRole("link", { name: "Back to Platform" })).toHaveAttribute(
			"href",
			/\/teams\/platform$/,
		);
	});

	test.describe("update", () => {
		const spec = {
			enabled: true,
			poolIds: ["pool-ollama", "pool-old"],
			models: ["anthropic"],
			rateLimits: [{ rateLimitId: "rl-1", models: [], shared: true }],
			budgets: [{ budgetId: "budget-1", shared: true }],
		};
		const metadata = {
			id: "pol-1",
			name: "pol-1",
			displayName: "Team policy",
			owner: { kind: "team", id: TEAM },
			resourceVersion: "7",
		};
		const unlinkedNote = "Pools no longer linked are kept; delete them from Pools if unused.";

		/** Opens the form on the team's own policy: a kept keyless pool, then one pool of its Anthropic account. */
		async function openOwnPolicy(page: Page): Promise<Sent[]> {
			const sent = await mockAccessApi(page, {
				policies: [policy("pol-1", "Team policy", { kind: "team", id: TEAM }, spec)],
				bindings: [binding("pol-1", ["acct-team"])],
				pools: [
					pool("pool-ollama", "Ollama pool", { hostId: OLLAMA, accountIds: [] }),
					pool("pool-old", "Old pool", { hostId: ANTHROPIC, accountIds: ["acct-anthropic"] }),
				],
			});
			await page.goto(SET_ACCESS);
			await expect(page.getByText("Policy Team policy", { exact: true })).toBeVisible();
			await expect(page.getByRole("switch", { name: "Ollama pool" })).toBeChecked();
			await expect(page.getByRole("button", { name: /Platform Anthropic/ })).toHaveAttribute(
				"aria-pressed",
				"true",
			);
			return sent;
		}

		async function save(page: Page) {
			await page.getByRole("button", { name: "Next" }).click();
			await page.getByRole("button", { name: "Save access" }).click();
			await expect(page.getByText("Access saved")).toBeVisible();
		}

		test("an unchanged save has nothing to send", async ({ page }) => {
			const sent = await openOwnPolicy(page);
			await page.getByRole("button", { name: "Next" }).click();
			await expect(page.getByText("Nothing changed.")).toBeVisible();
			await expect(page.getByRole("button", { name: "Save access" })).toBeDisabled();
			expect(sent).toEqual([]);
		});

		test("changing only the models sends one PUT with the same pools", async ({ page }) => {
			const sent = await openOwnPolicy(page);
			await page.getByRole("button", { name: "Remove anthropic" }).click();
			await save(page);
			expect(writes(sent)).toEqual(["PUT policies/by-id/pol-1"]);
			expect(sent[0]?.body).toEqual({ metadata, spec: { ...spec, models: [] } });
		});

		test("one more account at a host makes one new pool and unlinks the old", async ({
			page,
		}) => {
			const sent = await openOwnPolicy(page);
			await page.getByRole("button", { name: /My Anthropic/ }).click();
			await page.getByRole("button", { name: "Next" }).click();
			await expect(page.getByText(unlinkedNote)).toBeVisible();
			await page.getByRole("button", { name: "Save access" }).click();
			await expect(page.getByText("Access saved")).toBeVisible();
			expect(writes(sent)).toEqual([
				"POST accounts/acct-mine/shares",
				"POST pools",
				"PUT policies/by-id/pol-1",
			]);
			expect(sent[1]?.body.spec).toEqual({
				hostId: ANTHROPIC,
				accountIds: ["acct-anthropic", "acct-share"],
			});
			expect(sent[2]?.body).toEqual({
				metadata,
				spec: { ...spec, poolIds: ["pool-ollama", "made-2"] },
			});
		});

		test("removing a host's accounts unlinks its pool and makes none", async ({ page }) => {
			const sent = await openOwnPolicy(page);
			await page.getByRole("button", { name: /Platform Anthropic/ }).click();
			await page.getByRole("button", { name: "Next" }).click();
			await expect(page.getByText(unlinkedNote)).toBeVisible();
			await page.getByRole("button", { name: "Save access" }).click();
			await expect(page.getByText("Access saved")).toBeVisible();
			expect(writes(sent)).toEqual(["PUT policies/by-id/pol-1"]);
			expect(sent[0]?.body).toEqual({
				metadata,
				spec: { ...spec, poolIds: ["pool-ollama"] },
			});
		});
	});

	test("copy: a shared policy is duplicated, changed and bound", async ({ page }) => {
		const spec = {
			enabled: true,
			models: ["anthropic"],
			rateLimits: [{ rateLimitId: "rl-1", models: [], shared: true }],
		};
		const sent = await mockAccessApi(page, {
			policies: [policy("pol-shared", "Shared policy", { kind: "team", id: TEAM }, spec)],
			bindings: [binding("pol-shared", ["acct-team", "acct-other"])],
		});
		await page.goto(SET_ACCESS);
		await expect(
			page.getByText(
				"Policy Shared policy, shared with 1 other account: saving makes a copy for Platform",
			),
		).toBeVisible();
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("Access saved")).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pools",
			"POST policies/pol-shared/duplicate",
			"PUT policies/by-id/copy-1",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[1]?.body).toEqual({
			displayName: "Platform access",
			owner: { kind: "team", id: TEAM },
		});
		expect(sent[2]?.body.spec).toEqual({ ...spec, poolIds: ["made-1"] });
		expect(sent[3]?.body).toEqual({ policyId: "copy-1" });
	});

	test("a policy set above the caller offers no fields and no save", async ({ page }) => {
		const sent = await mockAccessApi(page, { bindings: [binding("hidden", ["acct-team"])] });
		await page.goto(SET_ACCESS);
		await expect(
			page.getByText("Limited by a policy you can't see or change. Ask whoever set it."),
		).toBeVisible();
		await expect(page.getByRole("switch", { name: "Use every credential in scope" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: /Next|Save access/ })).toHaveCount(0);
		expect(sent).toEqual([]);
	});

	test("a failed write stops the run and Retry resumes at it", async ({ page }) => {
		const sent = await mockAccessApi(page, { failOnce: "policies" });
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("policy refused")).toBeVisible();
		await expect(page.getByText("1 of 3 steps are done and kept.")).toBeVisible();
		expect(writes(sent)).toEqual(["POST pools"]);

		await page.getByRole("button", { name: "Retry" }).click();
		await expect(page.getByText("Access saved")).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pools",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
		expect(sent[1]?.body.spec).toMatchObject({ poolIds: ["made-1"] });
	});
});
