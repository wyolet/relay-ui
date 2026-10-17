import { expect, type Page, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

interface Client {
	name: string;
	tokenPrefix: string;
	createdAt: string;
	lastUsedAt?: string;
	revoked: boolean;
}

interface ScimMock {
	clients: Client[];
	enabled: boolean;
	/** Names the server refuses although they aren't listed (revoked elsewhere). */
	refused: string[];
	requests: { method: string; path: string; body: unknown }[];
	settingsPuts: unknown[];
}

const CREATED_TOKEN = "scim_created_0123456789abcdef";
const ROTATED_TOKEN = "scim_rotated_fedcba9876543210";

function json(body: unknown, status = 200) {
	return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function mockScim(
	page: Page,
	init: Partial<Pick<ScimMock, "clients" | "enabled" | "refused">> = {},
): Promise<ScimMock> {
	const mock: ScimMock = {
		clients: init.clients ?? [],
		enabled: init.enabled ?? true,
		refused: init.refused ?? [],
		requests: [],
		settingsPuts: [],
	};

	await page.route("**/api/scim-clients**", (route) => {
		const req = route.request();
		if (req.resourceType() !== "fetch" && req.resourceType() !== "xhr") {
			return route.fallback();
		}
		const path = new URL(req.url()).pathname.replace(/^.*?\/api\//, "");
		const body = req.postDataJSON?.() ?? null;
		mock.requests.push({ method: req.method(), path, body });

		if (req.method() === "GET") return route.fulfill(json({ clients: mock.clients }));

		if (path === "scim-clients") {
			const name = (body as { name: string }).name;
			if (mock.refused.includes(name) || mock.clients.some((c) => c.name === name)) {
				return route.fulfill(
					json(
						{
							error: {
								type: "invalid_request_error",
								message:
									"a SCIM client has or had this name; a name is issued once, so choose another",
							},
						},
						409,
					),
				);
			}
			const row = {
				name,
				tokenPrefix: CREATED_TOKEN.slice(0, 12),
				createdAt: "2026-10-17T10:00:00Z",
				revoked: false,
			};
			mock.clients.push(row);
			return route.fulfill(json({ ...row, token: CREATED_TOKEN }, 201));
		}

		const [, name = "", action] = path.split("/");
		const client = mock.clients.find((c) => c.name === name);
		if (!client) return route.fulfill(json({ error: { message: "no client" } }, 404));
		if (action === "rotate") {
			client.tokenPrefix = ROTATED_TOKEN.slice(0, 12);
			return route.fulfill(json({ ...client, token: ROTATED_TOKEN }));
		}
		client.revoked = true;
		return route.fulfill({ status: 204 });
	});

	await page.route("**/api/settings/auth:scim", (route) => {
		if (route.request().method() === "PUT") {
			const body = route.request().postDataJSON();
			mock.settingsPuts.push(body);
			mock.enabled = body.enabled;
			return route.fulfill(json({ section: "auth:scim", value: body }));
		}
		return route.fulfill(
			json({ section: "auth:scim", value: { enabled: mock.enabled } }),
		);
	});

	return mock;
}

const entra: Client = {
	name: "entra",
	tokenPrefix: "scim_ab12cd34",
	createdAt: "2026-10-01T09:00:00Z",
	lastUsedAt: "2026-10-16T12:30:00Z",
	revoked: false,
};
const okta: Client = {
	name: "okta",
	tokenPrefix: "scim_zz99yy88",
	createdAt: "2026-09-01T09:00:00Z",
	revoked: true,
};

async function asAdmin(page: Page) {
	await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
}

function row(page: Page, name: string) {
	return page.getByRole("row").filter({ hasText: name });
}

async function openRowAction(page: Page, name: string, action: string) {
	await row(page, name).getByRole("button", { name: "Row actions" }).click();
	await page.getByRole("menuitem", { name: action }).click();
}

async function storageText(page: Page): Promise<string> {
	return page.evaluate(() =>
		JSON.stringify({ ...localStorage, ...sessionStorage }),
	);
}

test.describe("SCIM clients", () => {
	test("lists clients with prefix, dates, revoked badge and the base URL", async ({
		page,
	}) => {
		await asAdmin(page);
		await mockScim(page, { clients: [entra, okta] });

		await page.goto("/scim-clients");
		await expect(row(page, "entra")).toContainText("scim_ab12cd34…");
		await expect(row(page, "entra")).toContainText("Active");
		await expect(row(page, "okta")).toContainText("Never");
		await expect(row(page, "okta")).toContainText("Revoked");
		await expect(
			row(page, "okta").getByRole("button", { name: "Row actions" }),
		).toHaveCount(0);
		await expect(page.getByText(/\/scim\/v2$/).first()).toBeVisible();
		await expect(page.getByText("SCIM provisioning is disabled")).toHaveCount(0);
	});

	test("warns when live clients exist but SCIM is disabled", async ({ page }) => {
		await asAdmin(page);
		await mockScim(page, { clients: [entra], enabled: false });

		await page.goto("/scim-clients");
		await expect(page.getByText("SCIM provisioning is disabled")).toBeVisible();
		await page.getByRole("link", { name: "Enable it in settings" }).click();
		await expect(page).toHaveURL(/\/settings\/scim$/);
	});

	test("create shows the token once and keeps it nowhere", async ({ page }) => {
		await asAdmin(page);
		const mock = await mockScim(page);

		await page.goto("/scim-clients");
		await page.getByRole("button", { name: "New client" }).click();
		await page.getByLabel("Name").fill("google");
		await page.getByRole("button", { name: "Create" }).click();

		await expect(page.getByText(CREATED_TOKEN)).toBeVisible();
		await expect(page.getByText("you won't see it again")).toBeVisible();
		expect(mock.requests).toContainEqual({
			method: "POST",
			path: "scim-clients",
			body: { name: "google" },
		});

		await page.getByRole("button", { name: "Done" }).click();
		await expect(row(page, "google")).toBeVisible();
		await expect(page.getByText(CREATED_TOKEN)).toHaveCount(0);
		expect(await page.content()).not.toContain(CREATED_TOKEN);
		expect(await storageText(page)).not.toContain(CREATED_TOKEN);

		// Reopening the flow starts empty rather than replaying the token.
		await page.getByRole("button", { name: "New client" }).click();
		await expect(page.getByLabel("Name")).toHaveValue("");
		expect(await page.content()).not.toContain(CREATED_TOKEN);
	});

	test("refuses a revoked client's name before asking the server", async ({
		page,
	}) => {
		await asAdmin(page);
		const mock = await mockScim(page, { clients: [entra, okta] });

		await page.goto("/scim-clients");
		await page.getByRole("button", { name: "New client" }).click();
		await page.getByLabel("Name").fill("okta");
		await page.getByRole("button", { name: "Create" }).click();

		await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
		await expect(page.getByText(/never issued again/)).toBeVisible();
		expect(mock.requests.filter((r) => r.method === "POST")).toHaveLength(0);

		// A corrected name clears the refusal and goes through.
		await page.getByLabel("Name").fill("okta-2");
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByText(CREATED_TOKEN)).toBeVisible();
	});

	test("shows the server's refusal of a reused name on the field", async ({
		page,
	}) => {
		await asAdmin(page);
		await mockScim(page, { refused: ["onelogin"] });

		await page.goto("/scim-clients");
		await page.getByRole("button", { name: "New client" }).click();
		await page.getByLabel("Name").fill("onelogin");
		await page.getByRole("button", { name: "Create" }).click();

		await expect(page.getByText(/a name is issued once/)).toBeVisible();
		await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
		await expect(page.getByRole("dialog")).toBeVisible();
	});

	test("rotate asks first, then shows the new token once", async ({ page }) => {
		await asAdmin(page);
		const mock = await mockScim(page, { clients: [entra] });

		await page.goto("/scim-clients");
		await openRowAction(page, "entra", "Rotate token");
		await expect(page.getByText(/current token stops working at once/)).toBeVisible();
		await page.getByRole("button", { name: "Rotate", exact: true }).click();

		await expect(page.getByText(ROTATED_TOKEN)).toBeVisible();
		expect(mock.requests).toContainEqual({
			method: "POST",
			path: "scim-clients/entra/rotate",
			body: null,
		});
		await page.getByRole("button", { name: "Done" }).click();
		expect(await page.content()).not.toContain(ROTATED_TOKEN);
	});

	test("cancelling the rotate confirm sends nothing", async ({ page }) => {
		await asAdmin(page);
		const mock = await mockScim(page, { clients: [entra] });

		await page.goto("/scim-clients");
		await openRowAction(page, "entra", "Rotate token");
		await page.getByRole("button", { name: "Cancel" }).click();
		expect(mock.requests.filter((r) => r.method === "POST")).toHaveLength(0);
	});

	test("revoke warns it's permanent, then marks the client revoked", async ({
		page,
	}) => {
		await asAdmin(page);
		const mock = await mockScim(page, { clients: [entra] });

		await page.goto("/scim-clients");
		await openRowAction(page, "entra", "Revoke");
		const confirm = page.getByRole("alertdialog");
		await expect(confirm).toContainText("This is permanent");
		await expect(confirm).toContainText("its name can't be reused");
		await confirm.getByRole("button", { name: "Revoke" }).click();

		await expect(row(page, "entra")).toContainText("Revoked");
		expect(mock.requests).toContainEqual({
			method: "POST",
			path: "scim-clients/entra/revoke",
			body: null,
		});
	});

	test("an admin saves the auth:scim section", async ({ page }) => {
		await asAdmin(page);
		const mock = await mockScim(page, { enabled: false });

		await page.goto("/settings/scim");
		await page.getByRole("switch", { name: "Enable SCIM provisioning" }).click();
		await page
			.getByRole("switch", { name: "Disable users instead of deleting them" })
			.click();
		await page.getByRole("combobox", { name: "Sign-in link claim" }).click();
		await page.getByRole("option", { name: /^oid/ }).click();
		await page.getByRole("button", { name: "Save changes" }).click();

		await expect.poll(() => mock.settingsPuts.length).toBe(1);
		expect(mock.settingsPuts[0]).toMatchObject({
			enabled: true,
			deleteDisables: true,
			linkClaim: "oid",
		});
	});
});

test.describe("SCIM for non-admins", () => {
	test("the nav entry is hidden and the page refuses without asking", async ({
		page,
	}) => {
		await mockApi(page, EMPTY_GRAPH);
		const mock = await mockScim(page, { clients: [entra] });

		await page.goto("/scim-clients");
		await expect(page.getByText("Only admins can manage SCIM clients")).toBeVisible();
		await expect(page.getByRole("link", { name: "SCIM clients" })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Groups" })).toBeVisible();
		expect(mock.requests).toHaveLength(0);
	});

	test("SCIM settings are read-only", async ({ page }) => {
		await mockApi(page, EMPTY_GRAPH);
		await mockScim(page, { enabled: true });

		await page.goto("/settings/scim");
		await expect(page.getByText("Only an admin can change SCIM settings")).toBeVisible();
		await expect(
			page.getByRole("switch", { name: "Enable SCIM provisioning" }),
		).toBeDisabled();
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Manage SCIM clients" })).toHaveCount(0);
	});
});
