import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const PROJECT = "project-1";
const HOST = "host-anthropic";
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

function providerAccount(id: string, displayName: string, owner: object) {
	return {
		metadata: { id, name: id, displayName, owner },
		spec: { kind: "provider", hostId: HOST },
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

/** Answers the form's reads and writes; `failOnce` names a write that fails the first time. */
async function mockAgentApi(page: Page, failOnce?: FailOnce): Promise<Sent[]> {
	const sent: Sent[] = [];
	let failed = false;
	await mockApi(page, { ...EMPTY_GRAPH, contexts });
	await page.route("**/api/catalog/graph**", (route) =>
		route.fulfill({ json: catalog }),
	);
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			if (path !== "accounts") return route.fallback();
			if (url.searchParams.get("kind") === "service") {
				return route.fulfill({ json: { items: [laneAccount], total: 1 } });
			}
			const items = url.searchParams.has("usable_by")
				? [projectAccount]
				: [projectAccount, myAccount];
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
			path: "pools",
			status: 409,
			message: "pool refused",
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
			path: "service-accounts",
			status: 403,
			message: "not allowed in this project",
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
});
