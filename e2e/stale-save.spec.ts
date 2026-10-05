import { expect, type Route, test } from "@playwright/test";
import { EMPTY_GRAPH, type MockGraph, mockApi } from "./fixtures/mockApi";

const STALE_MESSAGE = /changed since you opened it/;

interface PolicyRow {
	metadata: {
		id: string;
		name: string;
		displayName: string;
		owner: { kind: string };
		resourceVersion: string;
	};
	spec: { enabled: boolean; hostKeyIds: string[]; models: string[] };
}

function policyAt(version: string, displayName: string): PolicyRow {
	return {
		metadata: {
			id: "policy-1",
			name: "team-policy",
			displayName,
			owner: { kind: "user" },
			resourceVersion: version,
		},
		spec: { enabled: true, hostKeyIds: [], models: [] },
	};
}

const staleBody = {
	error: {
		type: "invalid_request_error",
		code: "stale_resource_version",
		message:
			'policy "policy-1" changed since you opened it; reload it and apply your change again',
	},
};

/**
 * Answers PUT /policies/by-id/policy-1 like the relay: 409 unless the body
 * carries the stored row's version. Returns the bodies it received.
 */
async function mockPolicyUpdates(
	page: import("@playwright/test").Page,
	graph: MockGraph,
): Promise<PolicyRow[]> {
	const received: PolicyRow[] = [];
	await page.route("**/api/policies/by-id/policy-1", (route: Route) => {
		if (route.request().method() !== "PUT") return route.fallback();
		const body = route.request().postDataJSON() as PolicyRow;
		received.push(body);
		const stored = graph.policies[0] as PolicyRow;
		if (body.metadata.resourceVersion !== stored.metadata.resourceVersion) {
			return route.fulfill({
				status: 409,
				contentType: "application/json",
				body: JSON.stringify(staleBody),
			});
		}
		const next = {
			...body,
			metadata: {
				...body.metadata,
				resourceVersion: String(Number(stored.metadata.resourceVersion) + 1),
			},
		};
		graph.policies[0] = next;
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(next),
		});
	});
	return received;
}

test.describe("Stale saves", () => {
	test("an edit form keeps the version it opened with and reloads on 409", async ({
		page,
	}) => {
		const graph: MockGraph = {
			...EMPTY_GRAPH,
			policies: [policyAt("1", "Team policy")],
		};
		await mockApi(page, graph);
		const puts = await mockPolicyUpdates(page, graph);

		await page.goto("/policies/team-policy/edit");
		const displayName = page.getByPlaceholder("Default policy");
		await expect(displayName).toHaveValue("Team policy");

		// Someone else saves the row while the form is open.
		graph.policies[0] = policyAt("2", "Renamed elsewhere");

		await displayName.fill("My edit");
		await page.getByRole("button", { name: "Save changes" }).click();

		await expect(page.getByText(STALE_MESSAGE)).toBeVisible();
		expect(puts).toHaveLength(1);
		expect(puts[0]?.metadata.resourceVersion).toBe("1");

		await page.getByRole("button", { name: "Reload" }).click();
		await expect(displayName).toHaveValue("Renamed elsewhere");
		expect(puts).toHaveLength(1);

		await displayName.fill("My edit");
		await page.getByRole("button", { name: "Save changes" }).click();
		await expect.poll(() => puts.length).toBe(2);
		expect(puts[1]?.metadata.resourceVersion).toBe("2");
		await expect(page.getByText(STALE_MESSAGE)).toHaveCount(0);
	});

	test("a toggle on a changed row shows Reload instead of retrying", async ({
		page,
	}) => {
		const graph: MockGraph = {
			...EMPTY_GRAPH,
			policies: [policyAt("1", "Team policy")],
		};
		await mockApi(page, graph);
		const puts = await mockPolicyUpdates(page, graph);

		await page.goto("/policies/team-policy");
		await expect(page.getByRole("button", { name: "Disable" })).toBeVisible();

		graph.policies[0] = {
			...policyAt("2", "Team policy"),
			spec: { enabled: false, hostKeyIds: [], models: [] },
		};
		await page.getByRole("button", { name: "Disable" }).click();

		await expect(page.getByText(STALE_MESSAGE)).toBeVisible();
		expect(puts).toHaveLength(1);
		expect(puts[0]?.metadata.resourceVersion).toBe("1");

		await page.getByRole("button", { name: "Reload" }).click();
		await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
		expect(puts).toHaveLength(1);
	});
});
