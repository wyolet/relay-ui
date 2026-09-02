import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

const provider = {
	metadata: { id: "prov-openai", name: "openai" },
	spec: { enabled: true },
};
const host = {
	metadata: { id: "host-1", name: "openai" },
	spec: { baseURL: "https://api.openai.com", enabled: true },
};
const model = {
	metadata: {
		id: "model-gpt",
		name: "gpt-4o",
		owner: { kind: "provider", id: "prov-openai" },
	},
	spec: {
		enabled: true,
		hosts: [{ hostId: "host-1", upstreamName: "gpt-4o", adapter: "openai", enabled: true }],
	},
};
const hostKey = {
	metadata: { id: "hk-1", name: "openai-prod", owner: { kind: "user" } },
	spec: { hostId: "host-1", policyId: "policy-1", enabled: true, valueFrom: { kind: "stored" } },
};

const cleanPolicy = {
	metadata: {
		id: "policy-clean",
		name: "clean-policy",
		displayName: "Clean policy",
		owner: { kind: "user" },
	},
	spec: {
		enabled: true,
		hostKeyIds: ["hk-1"],
		models: ["openai/gpt-4o"],
	},
};

const brokenPolicy = {
	metadata: {
		id: "policy-broken",
		name: "broken-policy",
		displayName: "Broken policy",
		owner: { kind: "user" },
	},
	spec: {
		enabled: true,
		hostKeyIds: [], // no host keys → error
		models: [],
	},
};

test.describe("Diagnostics — Policies", () => {
	test("policy with no host keys shows an error dot in the list and an error message on detail", async ({
		page,
	}) => {
		await mockApi(page, {
			...EMPTY_GRAPH,
			policies: [brokenPolicy],
			hostKeys: [],
			hosts: [host],
			models: [model],
			providers: [provider],
		});

		await page.goto("/policies");
		const row = page.locator("tr", { hasText: "Broken policy" });
		await expect(row).toBeVisible();
		// Diagnostic dot has aria-label "1 error".
		await expect(row.getByLabel(/error/)).toBeVisible();

		await page.goto("/policies/broken-policy");
		await expect(
			page.getByText("No host keys attached", { exact: false }),
		).toBeVisible();
	});

	test("clean policy with host keys and a key has no error dot in the list", async ({
		page,
	}) => {
		const key = {
			metadata: { id: "rk-1", name: "app-prod", owner: { kind: "user" } },
			spec: {
				enabled: true,
				keyHash: "hash",
				policyId: "policy-clean",
			},
		};
		await mockApi(page, {
			...EMPTY_GRAPH,
			policies: [cleanPolicy],
			hostKeys: [hostKey],
			hosts: [host],
			models: [model],
			providers: [provider],
			keys: [key],
		});

		await page.goto("/policies");
		const row = page.locator("tr", { hasText: "Clean policy" });
		await expect(row).toBeVisible();
		// No error/warning chip in the row.
		await expect(row.getByLabel(/error/)).toHaveCount(0);
		await expect(row.getByLabel(/warning/)).toHaveCount(0);
	});

	test("disabled rate limit referenced by an enabled policy shows a warning on the policy", async ({
		page,
	}) => {
		const disabledRL = {
			metadata: { id: "rl-1", name: "default", displayName: "Default", owner: { kind: "user" } },
			spec: {
				enabled: false,
				rules: [
					{ amount: 100, meter: "requests", strategy: "token-bucket", window: 60_000_000_000 },
				],
			},
		};
		const policy = {
			...cleanPolicy,
			spec: { ...cleanPolicy.spec, rateLimitId: "rl-1" },
		};
		await mockApi(page, {
			...EMPTY_GRAPH,
			policies: [policy],
			hostKeys: [hostKey],
			hosts: [host],
			models: [model],
			providers: [provider],
			rateLimits: [disabledRL],
		});

		await page.goto("/policies/clean-policy");
		await expect(
			page.getByText('Rate limit "Default" is disabled', { exact: false }),
		).toBeVisible();
	});
});
