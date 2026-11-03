import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, type MockPlanIssue, mockApi } from "./fixtures/mockApi";

const policy = (id: string, name: string, displayName: string) => ({
	metadata: { id, name, displayName, owner: { kind: "user" } },
	spec: { enabled: true, poolIds: ["pool-1"], models: ["openai/gpt-4o"] },
});
const brokenPolicy = policy("policy-broken", "broken-policy", "Broken policy");
const cleanPolicy = policy("policy-clean", "clean-policy", "Clean policy");

const disabledRL = {
	metadata: {
		id: "rl-1",
		name: "default",
		displayName: "Default",
		owner: { kind: "user" },
	},
	spec: {
		enabled: false,
		rules: [
			{
				amount: 100,
				meter: "requests",
				strategy: "token-bucket",
				window: 60_000_000_000,
			},
		],
	},
};

const issue = (o: Partial<MockPlanIssue>): MockPlanIssue => ({
	code: "pools_serve_nothing",
	message:
		"none of its pools (main) has a usable key at an enabled host; requests under this policy cannot be served",
	kind: "policy",
	id: "policy-broken",
	name: "broken-policy",
	field: "",
	severity: "error",
	refs: [],
	...o,
});

const poolIssue = issue({
	code: "host_disabled",
	message: "host openai is disabled; the pool serves nothing",
	kind: "pool",
	id: "pool-1",
	name: "main",
	field: "spec.hostId",
	refs: [{ kind: "host", id: "host-1", name: "openai" }],
});

const rlIssue = issue({
	code: "rate_limit_disabled",
	message: "rate limit default is disabled; it does not apply to this policy",
	field: "spec.rateLimits[0]",
	severity: "warning",
	refs: [{ kind: "ratelimit", id: "rl-1", name: "default" }],
});

test.describe("Plan issues", () => {
	test("a policy's error shows as a dot in the list and on its page with its pools' issues", async ({
		page,
	}) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			policies: [brokenPolicy, cleanPolicy],
			planIssues: [issue({}), poolIssue],
		});

		await page.goto("/policies");
		const broken = page.locator("tr", { hasText: "Broken policy" });
		await expect(broken.getByLabel("1 error")).toBeVisible();
		const clean = page.locator("tr", { hasText: "Clean policy" });
		await expect(clean).toBeVisible();
		await expect(clean.getByLabel(/error|warning/)).toHaveCount(0);

		await page.goto("/policies/broken-policy");
		await expect(
			page.getByText("none of its pools (main)", { exact: false }),
		).toBeVisible();
		await expect(
			page.getByText(
				"Pool main: host openai is disabled; the pool serves nothing",
			),
		).toBeVisible();
	});

	test("a rate limit's page shows the policies it fails to apply to", async ({
		page,
	}) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			policies: [brokenPolicy],
			rateLimits: [disabledRL],
			planIssues: [rlIssue],
		});

		await page.goto("/policies/rate-limits/default");
		await expect(
			page.getByText(
				"Policy broken-policy: rate limit default is disabled; it does not apply to this policy",
			),
		).toBeVisible();
	});
});
