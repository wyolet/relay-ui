import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

function auditEvent(action: string) {
	return {
		id: action,
		ts: "2026-01-01T00:00:00Z",
		action,
		actor: { kind: "user", name: "alice" },
		outcome: { code: 200, status: "allowed" },
		request: {},
		resource: { kind: "Policy", name: "p" },
	};
}

test("a rolled-over time window keeps the rows until the next ones load", async ({
	page,
}) => {
	await page.clock.install({ time: new Date("2026-01-01T12:00:30Z") });
	await mockApi(page, { ...EMPTY_GRAPH, roles: ["admin"] });
	const froms: string[] = [];
	let action = "first.action";
	await page.route(/\/api\/audit(\?|$)/, async (route) => {
		froms.push(new URL(route.request().url()).searchParams.get("from") ?? "");
		const events = [auditEvent(action)];
		if (action !== "first.action") await new Promise((r) => setTimeout(r, 800));
		return route.fulfill({ json: { events } });
	});

	await page.goto("/audit");
	await expect(page.getByText("first.action")).toBeVisible();
	await page.evaluate(() => {
		const seen = { loader: false };
		Object.assign(window, { seen });
		new MutationObserver(() => {
			if (document.querySelector("output[aria-live]")) seen.loader = true;
		}).observe(document.body, { childList: true, subtree: true });
	});

	action = "second.action";
	await page.clock.fastForward("02:00");
	await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));

	await expect(page.getByText("second.action")).toBeVisible();
	expect(await page.evaluate(() => Reflect.get(window, "seen").loader)).toBe(
		false,
	);
	expect(new Set(froms).size).toBeGreaterThan(1);
});
