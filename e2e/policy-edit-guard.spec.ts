import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, type MockGraph, mockApi } from "./fixtures/mockApi";

function policy(name: string, displayName: string, extra: object = {}) {
	return {
		metadata: {
			id: `id-${name}`,
			name,
			displayName,
			owner: { kind: "user" },
			resourceVersion: "1",
		},
		spec: { enabled: true, models: [] },
		...extra,
	};
}

const blocked = policy("team-policy", "Team policy", {
	editable: false,
	editBlockedBy: {
		accounts: [
			{ id: "acc-1", name: "wyolet-relay", displayName: "Wyolet Relay", kind: "team" },
		],
		hidden: 2,
	},
});
const copy = policy("team-policy-copy", "Team policy copy", { editable: true });

test.describe("Policy edit guard", () => {
	test("a policy reaching accounts you can't set offers a duplicate instead of the form", async ({
		page,
	}) => {
		const graph: MockGraph = { ...EMPTY_GRAPH, policies: [blocked, copy] };
		await mockApi(page, graph);
		const duplicates: string[] = [];
		await page.route("**/api/policies/team-policy/duplicate", (route) => {
			duplicates.push(route.request().method());
			return route.fulfill({ json: copy });
		});

		await page.goto("/policies/team-policy/edit");
		await expect(
			page.getByRole("heading", { name: "Used by accounts you can't change" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Wyolet Relay" })).toBeVisible();
		await expect(page.getByText("2 more accounts you can't see")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);

		await page.getByRole("button", { name: "Duplicate policy" }).click();
		await expect(page).toHaveURL(/\/policies\/team-policy-copy\/edit$/);
		expect(duplicates).toEqual(["POST"]);
		await expect(page.getByRole("heading", { name: "Edit policy" })).toBeVisible();
	});
});
