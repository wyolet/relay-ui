import { describe, expect, it } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import { ApiError } from "@/api/types/errors";
import {
	accountFormValue,
	accountOptions,
	DEFAULT_ACCOUNT,
	defaultAccountFor,
	detectionErrorMessage,
	detectionVerdict,
} from "./hostKeyAccount";

const account = (
	id: string,
	hostId: string,
	owner: Account["metadata"]["owner"],
	extra: Partial<Account["spec"]> = {},
): Account => ({
	metadata: { id, name: id, owner },
	spec: { kind: "provider", hostId, ...extra },
});

const system = { kind: "system" } as const;
const accounts = [
	account("a-default", "h1", system, { default: true }),
	account("a-org", "h1", system, { orgId: "org-1" }),
	account("a-other-host", "h2", system),
	account("a-team", "h1", { kind: "team", id: "t1" }),
	// A caller account carries no hostId; this one checks kind alone excludes it.
	account("team-acme", "h1", system, { kind: "team" }),
];

describe("accountOptions", () => {
	it("lists the default choice, then the usable provider accounts at the host", () => {
		expect(accountOptions(accounts, "h1")).toEqual([
			{ value: DEFAULT_ACCOUNT, label: "Default account" },
			{ value: "a-org", label: "a-org · org-1" },
			{ value: "a-team", label: "a-team" },
		]);
		expect(accountOptions(accounts, "h2").map((o) => o.value)).toEqual([
			DEFAULT_ACCOUNT,
			"a-other-host",
		]);
	});

	it("leaves out shared accounts, which hold no keys", () => {
		const shared = account("a-shared", "h1", system, {
			sourceAccountId: "a-org",
		});
		expect(
			accountOptions([...accounts, shared], "h1").map((o) => o.value),
		).not.toContain("a-shared");
	});

	it("keeps the key's current account outside the usable set", () => {
		const team = accounts.filter((a) => a.metadata.id === "a-team");
		const current = accounts.find((a) => a.metadata.id === "a-org");
		expect(accountOptions(team, "h1", current).map((o) => o.value)).toEqual([
			DEFAULT_ACCOUNT,
			"a-team",
			"a-org",
		]);
	});
});

describe("defaultAccountFor / accountFormValue", () => {
	it("finds the owner's default account and reads it as the default choice", () => {
		expect(
			defaultAccountFor(accounts, "h1", "system", undefined)?.metadata.id,
		).toBe("a-default");
		expect(
			defaultAccountFor(accounts, "h2", "system", undefined),
		).toBeUndefined();
		expect(accountFormValue(accounts, "a-default")).toBe(DEFAULT_ACCOUNT);
		expect(accountFormValue(accounts, "a-org")).toBe("a-org");
		expect(accountFormValue(accounts, undefined)).toBe(DEFAULT_ACCOUNT);
	});
});

describe("detectionVerdict", () => {
	it("tells in-place, elsewhere and unmatched apart", () => {
		expect(
			detectionVerdict(
				{
					orgId: "org-1",
					currentAccountId: "a-org",
					matchingAccountId: "a-org",
				},
				accounts,
			),
		).toEqual({ kind: "in-place" });
		expect(
			detectionVerdict(
				{
					orgId: "org-1",
					currentAccountId: "a-default",
					matchingAccountId: "a-org",
				},
				accounts,
			),
		).toEqual({ kind: "elsewhere", matchingLabel: "a-org" });
		expect(
			detectionVerdict({ orgId: "org-9", currentAccountId: "a-org" }, accounts),
		).toEqual({ kind: "unmatched" });
	});
});

describe("detectionErrorMessage", () => {
	it("names 422 and 502 apart", () => {
		const err = (status: number) =>
			new ApiError(status, { type: "x", message: "detail" });
		expect(detectionErrorMessage(err(422))).toBe("Can't detect: detail");
		expect(detectionErrorMessage(err(502))).toBe(
			"The host refused the call: detail",
		);
		expect(detectionErrorMessage(new Error("boom"))).toBe("Detection failed.");
	});
});
