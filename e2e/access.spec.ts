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

interface Answer {
	status?: number;
	json: object;
}

/** `POST /pseudo-access`, served while `pseudoKinds` lists "access". */
interface OneRequest {
	/** The pre-fill dry run's answer (access omitted). */
	opening: Answer;
	/** Each later dry run's answer, in order; the last one repeats. */
	dryRuns?: Answer[];
	/** Each save's answer, in order; the last one repeats. */
	saves?: Answer[];
}

interface Setup {
	policies?: ReturnType<typeof policy>[];
	bindings?: ReturnType<typeof binding>[];
	pools?: ReturnType<typeof pool>[];
	/** `GET /pools?usable_by=…`: the pools the target's scope may link. */
	usablePools?: ReturnType<typeof pool>[];
	features?: Record<string, boolean>;
	pseudoKinds?: string[];
	oneRequest?: OneRequest;
	/** Collects the path of every GET. */
	reads?: string[];
	/** The usable accounts read is refused, as for a member who may not write the scope's pools. */
	refuseUsableAccounts?: boolean;
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
		pseudoKinds: setup.pseudoKinds ?? (setup.oneRequest ? ["access"] : []),
	});
	let dryRuns = 0;
	let saves = 0;
	const nth = (answers: Answer[] | undefined, i: number): Answer =>
		answers?.[Math.min(i, answers.length - 1)] ?? { json: { case: "none", warnings: [] } };
	await page.route("**/api/catalog/graph**", (route) => route.fulfill({ json: catalog }));
	await page.route("**/api/**", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*?\/api\//, "");
		const method = request.method();
		if (method === "GET") {
			if (path === `teams/${TEAM}`) return route.fulfill({ json: team });
			if (path === "pools") {
				const items = url.searchParams.has("usable_by")
					? (setup.usablePools ?? [])
					: (setup.pools ?? []);
				return route.fulfill({ json: { items, total: items.length } });
			}
			setup.reads?.push(path);
			if (path !== "accounts") return route.fallback();
			if (setup.refuseUsableAccounts && url.searchParams.has("usable_by")) {
				return route.fulfill({
					status: 403,
					json: { error: { type: "invalid_request_error", message: "forbidden" } },
				});
			}
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
		if (path === "pseudo-access" && setup.oneRequest) {
			const dryRun = url.searchParams.get("dryRun") === "true";
			const opening = dryRun && body.spec?.access === undefined;
			sent.push({
				method,
				path: opening ? "pseudo-access?opening" : dryRun ? "pseudo-access?dryRun" : path,
				body,
			});
			const answer = opening
				? setup.oneRequest.opening
				: dryRun
					? nth(setup.oneRequest.dryRuns, dryRuns++)
					: nth(setup.oneRequest.saves, saves++);
			return route.fulfill({ status: answer.status ?? (dryRun ? 200 : 201), json: answer.json });
		}
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

const ollamaPool = pool("pool-ollama", "Office Ollama", { hostId: OLLAMA, accountIds: [] });
const TEAM_TARGET = { kind: "team", id: TEAM };

const answer = (json: object, status?: number): Answer => ({
	...(status ? { status } : {}),
	json: { warnings: [], ...json },
});
const refusal = (status: number, error: object, more: object = {}): Answer => ({
	status,
	json: { error: { type: "invalid_request_error", ...error }, ...more },
});
const row = (kind: string, name: string) => ({ kind, id: `${kind}-${name}`, name });
const currentPool = (id: string, hostId: string, over: object = {}) => ({
	id,
	name: id,
	host: { id: hostId, name: hostId },
	accounts: [],
	hiddenAccounts: 0,
	labelled: false,
	...over,
});

const MADE_POLICY = [row("policy", "platform"), row("policy-binding", "platform-binding")];
const NONE_OPENING = answer({ case: "none" });
const NONE_DRY_RUN = answer({ case: "none", created: MADE_POLICY });
const NONE_SAVED = answer({
	case: "none",
	policy: { id: "pol-made", name: "platform" },
	created: MADE_POLICY,
});

const paths = (sent: Sent[]) => sent.map((s) => s.path);

/** Turns every credential off, picks the Ollama pool and Gemma, and opens the review step. */
async function pickOllamaAndGemma(page: Page) {
	await page.getByRole("switch", { name: "Use every credential in scope" }).click();
	await page
		.getByRole("group", { name: "Pools" })
		.getByRole("button", { name: /Office Ollama/ })
		.click();
	await page.getByRole("tab", { name: "Models" }).click();
	await page.getByRole("button", { name: /Gemma/ }).click();
	await page.getByRole("button", { name: "Next" }).click();
}

const OLLAMA_GEMMA = {
	spec: {
		target: TEAM_TARGET,
		access: { everyCredential: false, poolIds: ["pool-ollama"], models: ["google/gemma"] },
	},
};

test.describe("Set access in one request", () => {
	test("under no policy: opens from relay's dry run, lists what Save makes, saves once", async ({
		page,
	}) => {
		const reads: string[] = [];
		const sent = await mockAccessApi(page, {
			reads,
			usablePools: [ollamaPool],
			oneRequest: { opening: NONE_OPENING, dryRuns: [NONE_DRY_RUN], saves: [NONE_SAVED] },
		});
		await page.goto(SET_ACCESS);
		await expect(page.getByText("No policy yet")).toBeVisible();
		await pickOllamaAndGemma(page);

		const planned = page.getByRole("list", { name: "What Save access does" });
		await expect(planned.getByRole("listitem")).toHaveText([
			/^Policy\s*platform$/,
			/^Policy binding\s*platform-binding$/,
		]);
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("Access saved")).toBeVisible();
		await expect(page.getByText("Made a policy.")).toBeVisible();
		await expect(page.getByRole("link", { name: "View policy" })).toHaveAttribute(
			"href",
			/\/policies\/platform$/,
		);
		expect(paths(sent)).toEqual([
			"pseudo-access?opening",
			"pseudo-access?dryRun",
			"pseudo-access",
		]);
		expect(sent[0]?.body).toEqual({ spec: { target: TEAM_TARGET } });
		expect(sent[2]?.body).toEqual(OLLAMA_GEMMA);
		expect(sent[1]?.body).toEqual(OLLAMA_GEMMA);
		expect(reads).not.toContain("policy-bindings");
		expect(reads).not.toContain("policies");
	});

	test("its own policy: opens on relay's current access, lists changes and deletes, keeps hidden pools", async ({
		page,
	}) => {
		const sent = await mockAccessApi(page, {
			usablePools: [ollamaPool],
			oneRequest: {
				opening: answer({
					case: "own",
					current: {
						policy: { id: "pol-1", name: "team-policy" },
						pools: [
							currentPool("old-pool", ANTHROPIC, {
								accounts: [{ id: "acct-anthropic", name: "acct-anthropic" }],
							}),
							currentPool("pool-ollama", OLLAMA),
							currentPool("platform-at-anthropic", ANTHROPIC, {
								accounts: [{ id: "acct-anthropic", name: "acct-anthropic" }],
								labelled: true,
							}),
						],
						hiddenPools: 2,
						models: ["anthropic"],
						linksNoPools: false,
					},
				}),
				dryRuns: [
					answer({
						case: "own",
						created: [row("share", "acct-mine-share")],
						updated: [row("pool", "platform-at-anthropic"), row("policy", "team-policy")],
						deleted: [row("pool", "stale-pool")],
					}),
				],
				saves: [
					answer({
						case: "own",
						policy: { id: "pol-1", name: "team-policy" },
						hiddenPoolsKept: 2,
						updated: [row("policy", "team-policy")],
					}),
				],
			},
		});
		await page.goto(SET_ACCESS);
		await expect(page.getByText("Policy team-policy", { exact: true })).toBeVisible();
		await expect(page.getByText("2 more pools set by an admin stay.")).toBeVisible();
		await expect(page.getByRole("switch", { name: "old-pool" })).toBeChecked();
		await expect(
			page.getByRole("group", { name: "Pools" }).getByRole("button", { name: /Office Ollama/ }),
		).toHaveAttribute("aria-pressed", "true");
		await expect(page.getByRole("button", { name: /Platform Anthropic/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();

		const planned = page.getByRole("region", { name: "What Save access does" });
		await expect(planned.getByRole("list", { name: "Makes" })).toHaveText(/acct-mine-share/);
		await expect(planned.getByRole("list", { name: "Changes" }).getByRole("listitem")).toHaveText([
			/^Pool\s*platform-at-anthropic$/,
			/^Policy\s*team-policy$/,
		]);
		await expect(planned.getByRole("list", { name: "Deletes" })).toHaveText(/stale-pool/);
		await expect(page.getByText(/Pools no longer linked are kept/)).toHaveCount(0);
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("Changed its policy.")).toBeVisible();
		await expect(page.getByText("2 more pools set by an admin stay.")).toBeVisible();
		expect(paths(sent)).toEqual([
			"pseudo-access?opening",
			"pseudo-access?dryRun",
			"pseudo-access",
		]);
		expect(sent[2]?.body).toEqual({
			spec: {
				target: TEAM_TARGET,
				access: {
					everyCredential: false,
					poolIds: ["old-pool", "pool-ollama"],
					accountIds: ["acct-anthropic", "acct-mine"],
					models: ["anthropic"],
				},
			},
		});
	});

	test("nothing changed: Save stays off", async ({ page }) => {
		const sent = await mockAccessApi(page, {
			oneRequest: {
				opening: answer({
					case: "own",
					current: {
						policy: { id: "pol-1", name: "team-policy" },
						pools: null,
						hiddenPools: 0,
						models: ["anthropic"],
						linksNoPools: true,
					},
				}),
				dryRuns: [answer({ case: "own" })],
			},
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Nothing changed.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save access" })).toBeDisabled();
		expect(paths(sent)).toEqual(["pseudo-access?opening", "pseudo-access?dryRun"]);
		expect(sent[1]?.body).toEqual({
			spec: { target: TEAM_TARGET, access: { everyCredential: true, models: ["anthropic"] } },
		});
	});

	test("under no policy, every credential is unchanged: Save stays off", async ({ page }) => {
		await mockAccessApi(page, {
			oneRequest: { opening: NONE_OPENING, dryRuns: [answer({ case: "none", unchanged: true })] },
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("This is what Platform reaches already.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save access" })).toBeDisabled();
	});

	test("a shared policy on a service account: relay's target kind, then a copy", async ({
		page,
	}) => {
		const sent = await mockAccessApi(page, {
			oneRequest: {
				opening: answer({
					case: "copy",
					current: {
						policy: { id: "pol-shared", name: "shared" },
						pools: [],
						hiddenPools: 0,
						models: [],
						linksNoPools: true,
					},
				}),
				dryRuns: [answer({ case: "copy", created: MADE_POLICY })],
				saves: [answer({ case: "copy", policy: { id: "pol-copy", name: "shared-for-ci-bot" } })],
			},
		});
		await page.goto("/access/set?targetKind=serviceaccount&id=sa-1");
		await expect(
			page.getByText("Policy shared, shared or set elsewhere: saving makes a copy for CI bot"),
		).toBeVisible();
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		await expect(page.getByText("Made a copy of the shared policy for CI bot.")).toBeVisible();
		expect(sent[0]?.body).toEqual({ spec: { target: { kind: "service-account", id: "sa-1" } } });
		expect(sent[2]?.body).toEqual({
			spec: {
				target: { kind: "service-account", id: "sa-1" },
				access: { everyCredential: false, accountIds: ["acct-anthropic"] },
			},
		});
	});

	test("a policy set above the caller: relay's message under the line, no fields", async ({
		page,
	}) => {
		const message = "the account is held by a policy of team root";
		const sent = await mockAccessApi(page, {
			refuseUsableAccounts: true,
			oneRequest: {
				opening: refusal(
					403,
					{ code: "policy_set_above", message },
					{ pointer: "/spec/target" },
				),
			},
		});
		await page.goto(SET_ACCESS);
		await expect(
			page.getByText("Limited by a policy you can't see or change. Ask whoever set it."),
		).toBeVisible();
		await expect(page.getByText(message)).toBeVisible();
		await expect(page.getByRole("switch", { name: "Use every credential in scope" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: /Next|Save access/ })).toHaveCount(0);
		expect(paths(sent)).toEqual(["pseudo-access?opening"]);
	});

	test("a dry run's warning shows on the review step and Save still goes", async ({ page }) => {
		const warning = "A policy above excludes google/gemma.";
		const sent = await mockAccessApi(page, {
			usablePools: [ollamaPool],
			oneRequest: {
				opening: NONE_OPENING,
				dryRuns: [
					answer({
						case: "none",
						created: MADE_POLICY,
						warnings: [
							{
								code: "model_ref_blocked",
								kind: "policy",
								message: warning,
								pointer: "/spec/access/models",
							},
						],
					}),
				],
				saves: [NONE_SAVED],
			},
		});
		await page.goto(SET_ACCESS);
		await pickOllamaAndGemma(page);
		const warned = page
			.getByRole("status")
			.filter({ hasText: "Relay will accept this, with warnings" });
		await expect(warned.getByRole("listitem")).toHaveText([warning]);
		await expect(page.getByRole("button", { name: "Save access" })).toBeEnabled();
		await page.getByRole("button", { name: "Save access" }).click();
		await expect(page.getByText("Access saved")).toBeVisible();
		expect(paths(sent).filter((p) => p === "pseudo-access")).toHaveLength(1);
	});

	test("a refused account returns to the access step with relay's message by the list", async ({
		page,
	}) => {
		const sent = await mockAccessApi(page, {
			oneRequest: {
				opening: NONE_OPENING,
				dryRuns: [NONE_DRY_RUN],
				saves: [
					refusal(400, { message: "account is closed" }, { pointer: "/spec/access/accountIds/0" }),
				],
			},
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		const accounts = page.getByRole("group", { name: "Accounts" });
		await expect(accounts).toHaveAccessibleDescription("account is closed");
		expect(paths(sent).filter((p) => p === "pseudo-access")).toHaveLength(1);
		await page.getByRole("button", { name: /My Anthropic/ }).click();
		await expect(accounts).not.toHaveAccessibleDescription("account is closed");
	});

	test("a plan issue lists under the refusal heading on the review step", async ({ page }) => {
		await mockAccessApi(page, {
			oneRequest: {
				opening: NONE_OPENING,
				dryRuns: [NONE_DRY_RUN],
				saves: [
					refusal(
						422,
						{ code: "plan_issue", message: "plan issues" },
						{
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
					),
				],
			},
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();

		const refused = page.getByRole("alert").filter({ hasText: "Relay would refuse this setup" });
		await expect(refused.getByRole("listitem")).toHaveText([
			"The policy serves no model.",
			"A row you can't see blocks this.",
		]);
	});

	test("links a copy can't carry: relay's message on the review step, no field marked", async ({
		page,
	}) => {
		const message = "the copy would carry 1 budget the scope may not link";
		await mockAccessApi(page, {
			oneRequest: {
				opening: NONE_OPENING,
				dryRuns: [
					refusal(400, { code: "links_not_carried", message }, { pointer: "/spec/target" }),
				],
			},
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByRole("alert")).toHaveText(message);

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByRole("group", { name: "Accounts" })).not.toHaveAccessibleDescription(
			message,
		);
		await expect(page.getByRole("alert")).toHaveCount(0);
	});

	test("a conflict asks to try again with Save still available", async ({ page }) => {
		const sent = await mockAccessApi(page, {
			oneRequest: {
				opening: NONE_OPENING,
				dryRuns: [NONE_DRY_RUN],
				saves: [refusal(409, { code: "conflict", message: "conflict" }), NONE_SAVED],
			},
		});
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();
		await expect(page.getByRole("alert")).toHaveText("Something changed while saving. Try again.");
		await expect(page.getByRole("button", { name: "Save access" })).toBeEnabled();

		await page.getByRole("button", { name: "Save access" }).click();
		await expect(page.getByText("Access saved")).toBeVisible();
		expect(paths(sent).filter((p) => p === "pseudo-access")).toHaveLength(2);
	});

	test("with the access kind off, the chain runs", async ({ page }) => {
		const sent = await mockAccessApi(page, { pseudoKinds: ["agents"] });
		await page.goto(SET_ACCESS);
		await page.getByRole("switch", { name: "Use every credential in scope" }).click();
		await page.getByRole("button", { name: /Platform Anthropic/ }).click();
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Save access" }).click();
		await expect(page.getByText("Access saved")).toBeVisible();
		expect(writes(sent)).toEqual([
			"POST pools",
			"POST policies",
			"PUT accounts/acct-team/policy",
		]);
	});
});
