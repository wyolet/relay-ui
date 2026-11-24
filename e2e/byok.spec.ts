import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const TEAM = "team-1";
const HOST = "host-anthropic";

const contexts = [
	{ kind: "personal", id: "test-user", name: "test", displayName: "test", admin: true },
	{ kind: "team", id: TEAM, name: "platform", displayName: "Platform", admin: true },
	{
		kind: "project",
		id: "project-1",
		name: "search",
		displayName: "Search",
		teamId: TEAM,
		admin: true,
	},
	{
		kind: "project",
		id: "project-2",
		name: "billing",
		displayName: "Billing",
		teamId: "team-2",
		admin: true,
	},
];

const hosts = [
	{
		metadata: { id: HOST, name: "anthropic", displayName: "Anthropic" },
		spec: { baseURL: "https://api.anthropic.test", enabled: true },
	},
];

const teamAccount = {
	metadata: {
		id: "acct-team",
		name: "acct-team",
		displayName: "Platform Anthropic",
		owner: { kind: "team", id: TEAM },
	},
	spec: { kind: "provider", hostId: HOST },
};

interface Sent {
	method: string;
	path: string;
	body: Record<string, unknown>;
}

/** Answers the form's reads and writes; `detectStatus` is what the provider call answers. */
async function mockByokApi(page: Page, detectStatus = 200): Promise<Sent[]> {
	const sent: Sent[] = [];
	await mockApi(page, { ...EMPTY_GRAPH, contexts, hosts, accounts: [teamAccount] });
	await page.route("**/api/hosts/anthropic/policies", (route) =>
		route.fulfill({
			json: {
				host: { id: HOST, name: "anthropic", enabled: true },
				policies: [
					{ id: "tier-1", name: "anthropic-tier-1", enabled: true, rateLimits: [] },
					{ id: "tier-2", name: "anthropic-tier-2", enabled: true, rateLimits: [] },
				],
			},
		}),
	);
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const method = request.method();
		if (method === "GET") return route.fallback();
		const path = new URL(request.url()).pathname.replace(/^.*?\/api\//, "");
		const body = request.postDataJSON() ?? {};
		sent.push({ method, path, body });
		if (path.endsWith("/detect-account")) {
			return detectStatus === 200
				? route.fulfill({
						json: { orgId: "org-123", orgName: "Acme", currentAccountId: "made-1" },
					})
				: route.fulfill({
						status: detectStatus,
						json: { error: { type: "upstream_error", message: "invalid x-api-key" } },
					});
		}
		const id = `made-${sent.length}`;
		return route.fulfill({
			json: { ...body, metadata: { ...body.metadata, id, name: id } },
		});
	});
	return sent;
}

async function inTeamWorkspace(page: Page) {
	await page.addInitScript((team) => {
		localStorage.setItem(
			"work-context",
			JSON.stringify({ state: { selected: { kind: "team", id: team } }, version: 0 }),
		);
	}, TEAM);
}

test.describe("Bring your own key", () => {
	test("makes the account, sets its tier, stores the key and shares it", async ({ page }) => {
		const sent = await mockByokApi(page);
		await inTeamWorkspace(page);
		await page.goto("/host-keys/byok");

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Pick the provider the key is for.")).toBeVisible();
		await page.getByRole("radio", { name: "Anthropic" }).click();
		await expect(page.getByRole("radio", { name: /Team/ })).toBeChecked();
		await page.getByRole("button", { name: "Next" }).click();

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Paste the key.")).toBeVisible();
		await page.getByLabel("Key", { exact: true }).fill("sk-ant-secret");
		await page.getByRole("combobox", { name: "Tier" }).click();
		await page.getByRole("option", { name: "anthropic-tier-2" }).click();
		await page.getByRole("button", { name: "Next" }).click();

		await expect(page.getByRole("button", { name: /Search/ })).toHaveCount(0);
		await page.getByRole("button", { name: /Billing/ }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(page.getByText(/names its organization Acme/)).toBeVisible();
		expect(sent.map((s) => `${s.method} ${s.path}`)).toEqual([
			"POST accounts",
			"PUT accounts/made-1/policy",
			"POST host-keys",
			"POST host-keys/by-id/made-3/detect-account",
			"POST accounts/made-1/shares",
		]);
		expect(sent[0]?.body).toMatchObject({
			metadata: { displayName: "Anthropic account", owner: { kind: "team", id: TEAM } },
			spec: { kind: "provider", hostId: HOST },
		});
		expect(sent[1]?.body).toEqual({ policyId: "tier-2" });
		expect(sent[2]?.body.spec).toEqual({
			hostId: HOST,
			accountId: "made-1",
			enabled: true,
			value: "sk-ant-secret",
			valueFrom: { kind: "stored" },
		});
		expect(sent[4]?.body).toEqual({ receiver: { kind: "project", id: "project-2" } });
	});

	test("a key joining an existing account leaves the account as it is", async ({ page }) => {
		const sent = await mockByokApi(page, 502);
		await inTeamWorkspace(page);
		await page.goto("/host-keys/byok");
		await page.getByRole("radio", { name: "Anthropic" }).click();
		await page.getByRole("button", { name: "Next" }).click();

		await page.getByLabel("Key", { exact: true }).fill("sk-ant-secret");
		await page.getByRole("combobox", { name: "Account" }).click();
		await page.getByRole("option", { name: "Platform Anthropic" }).click();
		await expect(page.getByRole("combobox", { name: "Tier" })).toHaveCount(0);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(page.getByText(/invalid x-api-key/)).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual([
			"host-keys",
			"host-keys/by-id/made-1/detect-account",
		]);
		expect(sent[0]?.body.spec).toMatchObject({ accountId: "acct-team" });
	});
});
