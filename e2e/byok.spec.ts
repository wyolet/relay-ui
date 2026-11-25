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

const KEYLESS_HOST = "host-ollama";

const hosts = [
	{
		metadata: { id: HOST, name: "anthropic", displayName: "Anthropic" },
		spec: { baseURL: "https://api.anthropic.test", enabled: true },
	},
	{
		metadata: { id: KEYLESS_HOST, name: "ollama", displayName: "Office Ollama" },
		spec: { baseURL: "http://ollama.test", enabled: true, noAuth: true },
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

interface PseudoBody {
	metadata: { displayName?: string };
	spec: {
		value?: string;
		accountId?: string;
		account?: { displayName?: string };
		tierPolicyId?: string;
		shareWith?: { kind: string; id: string }[];
	};
}

const slug = (name = "") => name.toLowerCase().replaceAll(" ", "-");

/** Relay's answer to a one-request key: rows in write order, the detection `answerPatch` sets. */
function pseudoAnswer(body: PseudoBody, answerPatch: object, warnings: object[]) {
	const spec = body.spec;
	const account = spec.accountId
		? { id: spec.accountId, name: spec.accountId }
		: { id: "acct-new", name: slug(spec.account?.displayName) };
	const hostKey = spec.value ? { id: "hk-1", name: slug(body.metadata.displayName) } : undefined;
	const shares = (spec.shareWith ?? []).map((receiver) => ({
		receiver,
		id: `share-${receiver.id}`,
		name: `${account.name}-${receiver.id}`,
	}));
	return {
		created: [
			...(spec.accountId ? [] : [{ kind: "account", ...account }]),
			...(spec.tierPolicyId
				? [{ kind: "policy-binding", id: "pb-1", name: `${spec.tierPolicyId}-binding` }]
				: []),
			...(hostKey ? [{ kind: "host-key", ...hostKey }] : []),
			...shares.map((s) => ({ kind: "account", id: s.id, name: s.name })),
		],
		account,
		...(hostKey ? { hostKey } : {}),
		shares,
		...(hostKey ? { detection: "detected", detected: { orgId: "org-123", orgName: "Acme" } } : {}),
		warnings,
		...answerPatch,
	};
}

interface ByokMock {
	detectStatus?: number;
	shareStatus?: number;
	/** Serves `pseudoKinds: ["host-keys"]`. */
	oneRequest?: boolean;
	/** Relay's answer to the first `POST /pseudo-host-keys` that isn't a dry run. */
	refuseOnce?: { status: number; json: object };
	/** The warnings every dry run answers. */
	dryRunWarnings?: object[];
	/** Replaces parts of every one-request answer. */
	answerPatch?: object;
}

/** Answers the form's reads and writes; `detectStatus` is what the provider call answers, `shareStatus` what each share does. A dry run is recorded as `pseudo-host-keys?dryRun`. */
async function mockByokApi(
	page: Page,
	{
		detectStatus = 200,
		shareStatus = 200,
		oneRequest,
		refuseOnce,
		dryRunWarnings = [],
		answerPatch = {},
	}: ByokMock = {},
): Promise<Sent[]> {
	const sent: Sent[] = [];
	let refused = false;
	await mockApi(page, {
		...EMPTY_GRAPH,
		contexts,
		hosts,
		accounts: [teamAccount],
		...(oneRequest ? { pseudoKinds: ["host-keys"] } : {}),
	});
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
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const body = request.postDataJSON() ?? {};
		if (path === "pseudo-host-keys") {
			const dryRun = url.searchParams.get("dryRun") === "true";
			sent.push({ method, path: dryRun ? "pseudo-host-keys?dryRun" : path, body });
			if (!dryRun && refuseOnce && !refused) {
				refused = true;
				return route.fulfill({ status: refuseOnce.status, json: refuseOnce.json });
			}
			return route.fulfill({
				status: dryRun ? 200 : 201,
				json: pseudoAnswer(body, answerPatch, dryRun ? dryRunWarnings : []),
			});
		}
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
		if (path.endsWith("/shares") && shareStatus !== 200) {
			return route.fulfill({
				status: shareStatus,
				json: { error: { type: "forbidden", message: "not an admin of Billing" } },
			});
		}
		const id = `made-${sent.length}`;
		return route.fulfill({
			json: { ...body, metadata: { ...body.metadata, id, name: id } },
		});
	});
	return sent;
}

async function pickAnthropic(page: Page) {
	const provider = page
		.getByRole("group", { name: "Provider" })
		.getByRole("button", { name: "Anthropic" });
	await provider.click();
	await expect(provider).toHaveAttribute("aria-pressed", "true");
}

/** Fills the key and leaves it in a new account, on the sharing step. */
async function storeNewKey(page: Page) {
	await page.goto("/host-keys/byok");
	await pickAnthropic(page);
	await page.getByRole("button", { name: "Next" }).click();
	await page.getByLabel("Key", { exact: true }).fill("sk-ant-secret");
	await page.getByRole("button", { name: "Next" }).click();
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
		await pickAnthropic(page);
		await expect(
			page
				.getByRole("group", { name: "Owner" })
				.getByRole("button", { name: /^Team/, pressed: true }),
		).toBeVisible();
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
		const sent = await mockByokApi(page, { detectStatus: 502 });
		await inTeamWorkspace(page);
		await page.goto("/host-keys/byok");
		await pickAnthropic(page);
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

	test("a refused share still ends on the stored key and names the share", async ({
		page,
	}) => {
		const sent = await mockByokApi(page, { shareStatus: 403 });
		await inTeamWorkspace(page);
		await storeNewKey(page);
		await page.getByRole("button", { name: /Billing/ }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(page.getByText("Not shared with everyone")).toBeVisible();
		await expect(page.getByText("not an admin of Billing")).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual([
			"accounts",
			"host-keys",
			"host-keys/by-id/made-2/detect-account",
			"accounts/made-1/shares",
		]);
	});

	test("a failed organization lookup is reported on the stored key", async ({ page }) => {
		await mockByokApi(page, { detectStatus: 500 });
		await inTeamWorkspace(page);
		await storeNewKey(page);
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(
			page.getByText("The provider refused a call made with this key"),
		).toBeVisible();
		await expect(page.getByText(/invalid x-api-key/)).toBeVisible();
	});
});

const submits = (sent: Sent[]) => sent.filter((s) => s.path === "pseudo-host-keys");

const TEAM_KEY_METADATA = {
	displayName: "Anthropic key",
	owner: { kind: "team", id: TEAM },
};

/** In the team workspace: Anthropic, the key, and `onKeyStep` on the key step; ends on the sharing step. */
async function toSharing(page: Page, onKeyStep: () => Promise<void> = async () => {}) {
	await inTeamWorkspace(page);
	await page.goto("/host-keys/byok");
	await pickAnthropic(page);
	await page.getByRole("button", { name: "Next" }).click();
	await page.getByLabel("Key", { exact: true }).fill("sk-ant-secret");
	await onKeyStep();
	await page.getByRole("button", { name: "Next" }).click();
}

async function pickTier(page: Page, tier: string) {
	await page.getByRole("combobox", { name: "Tier" }).click();
	await page.getByRole("option", { name: tier }).click();
}

function refusal(status: number, code: string | undefined, message: string, extra: object) {
	return { status, json: { error: { type: "invalid_request_error", code, message }, ...extra } };
}

test.describe("Bring your own key in one request", () => {
	test("a new account with its tier and a share: the dry run lists it, one request makes it", async ({
		page,
	}) => {
		const sent = await mockByokApi(page, { oneRequest: true });
		await toSharing(page, () => pickTier(page, "anthropic-tier-2"));

		const planned = page.getByRole("list", { name: "What Store key makes" });
		await expect(planned.getByRole("listitem")).toHaveText([
			/^Account\s*anthropic-account/,
			/^Policy binding\s*tier-2-binding/,
			/^Host key\s*anthropic-key/,
		]);
		await page.getByRole("button", { name: /Billing/ }).click();
		await expect(planned.getByRole("listitem")).toHaveCount(4);
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(page.getByText(/names its organization Acme/)).toBeVisible();
		await expect(
			page.getByRole("region", { name: "Shared with" }).getByRole("listitem"),
		).toHaveText(["Billing"]);
		expect(sent.map((s) => s.path)).toEqual([
			"pseudo-host-keys?dryRun",
			"pseudo-host-keys?dryRun",
			"pseudo-host-keys",
		]);
		expect(submits(sent)[0]?.body).toEqual({
			metadata: TEAM_KEY_METADATA,
			spec: {
				hostId: HOST,
				value: "sk-ant-secret",
				account: { displayName: "Anthropic account" },
				tierPolicyId: "tier-2",
				shareWith: [{ kind: "project", id: "project-2" }],
			},
		});
	});

	test("an existing account takes a tier too; detection and an existing share read quietly", async ({
		page,
	}) => {
		const sent = await mockByokApi(page, {
			oneRequest: true,
			answerPatch: {
				detection: "unsupported",
				detected: undefined,
				shares: [
					{
						receiver: { kind: "project", id: "project-2" },
						id: "acct-billing",
						name: "acct-billing",
						existing: true,
					},
				],
			},
		});
		await toSharing(page, async () => {
			await page.getByRole("combobox", { name: "Account" }).click();
			await page.getByRole("option", { name: "Platform Anthropic" }).click();
			await expect(page.getByRole("combobox", { name: "Tier" })).toContainText(
				"Keep the account's tier",
			);
			await pickTier(page, "anthropic-tier-1");
		});
		await page.getByRole("button", { name: /Billing/ }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		await expect(
			page.getByText("The provider can't name an organization for this key."),
		).toBeVisible();
		await expect(
			page.getByRole("region", { name: "Shared with" }).getByRole("listitem"),
		).toHaveText([/^Billing\s*already shared$/]);
		expect(submits(sent)[0]?.body).toEqual({
			metadata: TEAM_KEY_METADATA,
			spec: {
				hostId: HOST,
				value: "sk-ant-secret",
				accountId: "acct-team",
				tierPolicyId: "tier-1",
				shareWith: [{ kind: "project", id: "project-2" }],
			},
		});
	});

	test("a keyless host: no key, no sharing, the account made for the caller", async ({
		page,
	}) => {
		const sent = await mockByokApi(page, { oneRequest: true });
		await page.goto("/host-keys/byok");
		await page
			.getByRole("group", { name: "Provider" })
			.getByRole("button", { name: "Office Ollama" })
			.click();
		await page.getByRole("group", { name: "Owner" }).getByRole("button", { name: /^Personal/ }).click();
		await page.getByRole("button", { name: "Next" }).click();

		await expect(page.getByLabel("Key", { exact: true })).toHaveCount(0);
		await expect(page.getByLabel("Key name")).toHaveCount(0);
		await page.getByRole("button", { name: "Next" }).click();

		await expect(page.getByText(/relay reaches it through pools/)).toBeVisible();
		await expect(page.getByRole("group", { name: "Share with" })).toHaveCount(0);
		await expect(
			page.getByRole("list", { name: "What Make account makes" }).getByRole("listitem"),
		).toHaveText([/^Account\s*office-ollama-account/]);
		await page.getByRole("button", { name: "Make account" }).click();

		await expect(page.getByText("Account made")).toBeVisible();
		await expect(page.getByText("This provider takes no key, so none is needed.")).toBeVisible();
		await expect(page.getByRole("link", { name: "View key" })).toHaveCount(0);
		expect(submits(sent)[0]?.body).toEqual({
			metadata: { owner: { kind: "user" } },
			spec: { hostId: KEYLESS_HOST, account: { displayName: "Office Ollama account" } },
		});
	});

	test("a dry run's warning shows on the last step and by its field, and Store key still goes", async ({
		page,
	}) => {
		const warning = "The tier allows no model this account serves.";
		const sent = await mockByokApi(page, {
			oneRequest: true,
			dryRunWarnings: [
				{ code: "tier_serves_nothing", kind: "policy-binding", message: warning, pointer: "/spec/tierPolicyId" },
			],
		});
		await toSharing(page, () => pickTier(page, "anthropic-tier-2"));

		const warned = page
			.getByRole("status")
			.filter({ hasText: "Relay will accept this, with warnings" });
		await expect(warned.getByRole("listitem")).toHaveText([warning]);
		await expect(page.getByRole("alert")).toHaveCount(0);

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByRole("combobox", { name: "Tier" })).toHaveAccessibleDescription(warning);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		expect(submits(sent)).toHaveLength(1);
	});

	test("a key the provider refuses returns to the key step with the message by the key", async ({
		page,
	}) => {
		const message = "anthropic answered 401 to the key";
		const sent = await mockByokApi(page, {
			oneRequest: true,
			refuseOnce: refusal(422, "provider_refused_key", message, { pointer: "/spec/value" }),
		});
		await toSharing(page);
		await page.getByRole("button", { name: "Store key" }).click();

		const key = page.getByLabel("Key", { exact: true });
		await expect(key).toHaveAccessibleDescription(message);
		await expect(page.getByText("The provider refused a call made with this key")).toHaveCount(0);
		await key.fill("sk-ant-other");
		await expect(key).not.toHaveAccessibleDescription(message);
		expect(submits(sent)).toHaveLength(1);
	});

	test("an organization another account holds offers that account and sends it next time", async ({
		page,
	}) => {
		const message = "the key belongs to an organization another account holds";
		const sent = await mockByokApi(page, {
			oneRequest: true,
			refuseOnce: refusal(409, "organization_taken", message, {
				pointer: "/spec/account",
				account: { id: "acct-team", name: "acct-team" },
			}),
		});
		await toSharing(page);
		await page.getByRole("button", { name: "Store key" }).click();

		const account = page.getByRole("combobox", { name: "Account" });
		await expect(account).toHaveAccessibleDescription(message);
		await page.getByRole("button", { name: "Use Platform Anthropic" }).click();
		await expect(account).toContainText("Platform Anthropic");
		await expect(page.getByRole("button", { name: "Use Platform Anthropic" })).toHaveCount(0);
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		expect(submits(sent)[1]?.body.spec).toEqual({
			hostId: HOST,
			value: "sk-ant-secret",
			accountId: "acct-team",
		});
	});

	test("an organization held by an account the owner's list lacks shows the message alone", async ({
		page,
	}) => {
		const message = "the key belongs to an organization another account holds";
		await mockByokApi(page, {
			oneRequest: true,
			refuseOnce: refusal(409, "organization_taken", message, {
				pointer: "/spec/account",
				account: { id: "acct-elsewhere", name: "acct-elsewhere" },
			}),
		});
		await toSharing(page);
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByRole("combobox", { name: "Account" })).toHaveAccessibleDescription(
			message,
		);
		await expect(page.getByRole("button", { name: /^Use / })).toHaveCount(0);
	});

	test("a refused tier returns to the key step with the message by the tier", async ({ page }) => {
		const message = 'policy "other" is not a tier preset of host "anthropic"';
		await mockByokApi(page, {
			oneRequest: true,
			refuseOnce: refusal(400, undefined, message, { pointer: "/spec/tierPolicyId" }),
		});
		await toSharing(page, () => pickTier(page, "anthropic-tier-2"));
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByRole("combobox", { name: "Tier" })).toHaveAccessibleDescription(message);
	});

	test("a plan issue shows under the refusal heading on the step it belongs to", async ({
		page,
	}) => {
		await mockByokApi(page, {
			oneRequest: true,
			refuseOnce: refusal(422, "plan_issue", "plan issues", {
				issues: [
					{
						code: "tier_serves_nothing",
						kind: "policy-binding",
						message: "The tier allows no model.",
						pointer: "/spec/tierPolicyId",
					},
				],
			}),
		});
		await toSharing(page, () => pickTier(page, "anthropic-tier-2"));
		await page.getByRole("button", { name: "Store key" }).click();

		const refused = page.getByRole("alert").filter({ hasText: "Relay would refuse this setup" });
		await expect(refused.getByRole("listitem")).toHaveText(["The tier allows no model."]);
		await expect(page.getByRole("combobox", { name: "Tier" })).toBeVisible();
	});

	test("with the kind off the form runs its chain", async ({ page }) => {
		const sent = await mockByokApi(page);
		await toSharing(page);
		await page.getByRole("button", { name: "Store key" }).click();

		await expect(page.getByText("Key stored")).toBeVisible();
		expect(sent.map((s) => s.path)).toEqual([
			"accounts",
			"host-keys",
			"host-keys/by-id/made-2/detect-account",
		]);
	});
});
