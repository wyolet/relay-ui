import { describe, expect, test } from "bun:test";
import {
	scimBaseUrl,
	scimClientNameError,
	scimDisabledWithClients,
} from "@/lib/scim";

describe("scimBaseUrl", () => {
	test("drops the /api prefix the admin API mounts under", () => {
		expect(scimBaseUrl("https://relay.example.com/api")).toBe(
			"https://relay.example.com/scim/v2",
		);
	});

	test("keeps a reverse-proxy path prefix", () => {
		expect(scimBaseUrl("https://example.com/relay/api/")).toBe(
			"https://example.com/relay/scim/v2",
		);
	});

	test("a bare origin gains the SCIM path only", () => {
		expect(scimBaseUrl("http://localhost:8081")).toBe(
			"http://localhost:8081/scim/v2",
		);
	});
});

describe("scimClientNameError", () => {
	const clients = [
		{ name: "entra", revoked: false },
		{ name: "okta", revoked: true },
	];

	test("accepts a fresh DNS-1123 label", () => {
		expect(scimClientNameError("google-ws", clients)).toBeUndefined();
	});

	test("refuses a revoked client's name", () => {
		expect(scimClientNameError("okta", clients)).toContain(
			"never issued again",
		);
	});

	test("refuses a live client's name", () => {
		expect(scimClientNameError("entra", clients)).toContain("already exists");
	});

	test("refuses what isn't a label", () => {
		for (const bad of [
			"",
			"Entra",
			"-okta",
			"okta-",
			"ok_ta",
			"a".repeat(64),
		]) {
			expect(scimClientNameError(bad, [])).toBeDefined();
		}
	});
});

describe("scimDisabledWithClients", () => {
	test("warns only for live clients while disabled", () => {
		const live = [{ name: "entra", revoked: false }];
		const revoked = [{ name: "okta", revoked: true }];
		expect(scimDisabledWithClients(false, live)).toBe(true);
		expect(scimDisabledWithClients(true, live)).toBe(false);
		expect(scimDisabledWithClients(false, revoked)).toBe(false);
		expect(scimDisabledWithClients(false, [])).toBe(false);
	});
});
