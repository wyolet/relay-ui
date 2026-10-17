import { describe, expect, test } from "bun:test";
import { oidcStartUrl } from "./oidcStart";

describe("oidcStartUrl", () => {
	test("returns to the sign-in page on the page's own origin", () => {
		const url = new URL(
			oidcStartUrl(
				"https://relay.example.com/api",
				"https://ui.example.com/ui/login?error=flow_expired#x",
			),
		);
		expect(url.origin + url.pathname).toBe(
			"https://relay.example.com/api/auth/oidc/start",
		);
		expect(url.searchParams.get("return_to")).toBe(
			"https://ui.example.com/ui/login",
		);
	});
});
