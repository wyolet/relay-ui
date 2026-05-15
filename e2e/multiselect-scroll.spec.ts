import { expect, test } from "@playwright/test";
import { EMPTY_GRAPH, mockApi } from "./fixtures/mockApi";

/**
 * Investigation harness: reproduce the "host-key MultiSelect opens →
 * page scrolls" bug from PolicyForm and capture exactly what moves.
 */

const provider = {
	metadata: { id: "prov-openai", name: "openai" },
	spec: { enabled: true },
};
const host = {
	metadata: { id: "host-1", name: "openai" },
	spec: { baseURL: "https://api.openai.com", enabled: true },
};
const hostKeys = Array.from({ length: 6 }, (_, i) => ({
	metadata: {
		id: `hk-${i}`,
		name: `openai-${i}`,
		displayName: `OpenAI key ${i}`,
		owner: { kind: "user" },
	},
	spec: {
		hostId: "host-1",
		policyId: "host-policy-id",
		enabled: true,
		valueFrom: { kind: "stored" },
	},
}));
const models = Array.from({ length: 10 }, (_, i) => ({
	metadata: {
		id: `model-${i}`,
		name: `gpt-${i}`,
		owner: { kind: "provider", id: "prov-openai" },
	},
	spec: {
		enabled: true,
		hosts: [{ hostId: "host-1", upstreamName: `gpt-${i}`, adapter: "openai" }],
	},
}));
const policy = {
	metadata: {
		id: "policy-1",
		name: "my-policy",
		displayName: "My Policy",
		owner: { kind: "user" },
	},
	spec: { enabled: true, hostKeyIds: [], models: [] },
};

test("PolicyForm: opening host-key MultiSelect does not scroll the page", async ({
	page,
}) => {
	await mockApi(page, {
		...EMPTY_GRAPH,
		policies: [policy],
		hostKeys,
		hosts: [host],
		models,
		providers: [provider],
	});

	await page.setViewportSize({ width: 1280, height: 700 });
	await page.goto("/policies/my-policy");

	// Wait for the form to be present.
	await expect(page.getByRole("heading", { name: /My Policy/i })).toBeVisible();

	// Instrument scrollIntoView so we can see who calls it.
	await page.evaluate(() => {
		const orig = Element.prototype.scrollIntoView;
		Element.prototype.scrollIntoView = function (...args) {
			const el = this as Element;
			const tag = el.tagName;
			const cls = el.className?.toString().slice(0, 80);
			const id = el.id;
			console.log(
				"scrollIntoView called on",
				tag,
				`#${id}`,
				cls,
				JSON.stringify(args),
			);
			console.trace();
			return orig.apply(this, args as Parameters<typeof orig>);
		};
		(
			window as unknown as { __scrollEvents: number[] }
		).__scrollEvents = [];
		window.addEventListener("scroll", () => {
			(window as unknown as { __scrollEvents: number[] }).__scrollEvents.push(
				window.scrollY,
			);
		});
	});

	page.on("console", (msg) => {
		if (
			msg.text().includes("scrollIntoView") ||
			msg.text().startsWith("Trace")
		) {
			console.log("[browser]", msg.text());
		}
	});

	// Target the host-key MultiSelect specifically via its aria-label.
	const hostKeyTrigger = page.getByRole("button", { name: "Host keys" });
	await hostKeyTrigger.scrollIntoViewIfNeeded();
	// Now scroll page down ~150px so the trigger is closer to center but
	// some content is offscreen above.
	await page.evaluate(() => window.scrollBy({ top: 150, behavior: "instant" }));

	const before = await page.evaluate(() => window.scrollY);
	console.log("scrollY before click:", before);

	const triggerBox = await hostKeyTrigger.boundingBox();
	console.log("host-key trigger box before:", triggerBox);

	await hostKeyTrigger.click();
	await page.waitForTimeout(500); // let the popover open and any focus effects settle

	const after = await page.evaluate(() => window.scrollY);
	console.log("scrollY after click:", after);
	const delta = after - before;
	console.log("delta:", delta);

	// Capture which element ended up focused (helps diagnose).
	const focusedTag = await page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		if (!el) return null;
		return {
			tag: el.tagName,
			attrs: el.getAttributeNames().map((n) => `${n}=${el.getAttribute(n)}`),
		};
	});
	console.log("activeElement after open:", focusedTag);

	expect(delta).toBe(0);
});
