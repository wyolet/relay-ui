import { describe, expect, test } from "bun:test";
import {
	canDeleteAccount,
	canSetPayloadLogging,
	parseAccountKind,
	resolveHolder,
} from "@/accounts/accountView";
import {
	fromPayloadLoggingChoice,
	toPayloadLoggingChoice,
} from "@/accounts/payloadLogging";

describe("canDeleteAccount", () => {
	test("provider accounts are deletable", () => {
		expect(canDeleteAccount({ kind: "provider" })).toBe(true);
	});
	test("member accounts only once closed", () => {
		expect(canDeleteAccount({ kind: "member" })).toBe(false);
		expect(canDeleteAccount({ kind: "member", closed: true })).toBe(true);
	});
	test("other caller accounts are managed", () => {
		for (const kind of ["team", "project", "personal", "service"] as const) {
			expect(canDeleteAccount({ kind, closed: true })).toBe(false);
		}
	});
});

describe("parseAccountKind", () => {
	test("accepts generated kinds and rejects the rest", () => {
		expect(parseAccountKind("service")).toBe("service");
		expect(parseAccountKind("all")).toBeUndefined();
	});
});

describe("resolveHolder", () => {
	const sources = {
		users: [{ id: "u1", username: "alice" }],
		serviceAccounts: [
			{ metadata: { id: "s1", name: "ci-bot", displayName: "CI bot" } },
		],
	};

	test("a user resolves to the username", () => {
		expect(resolveHolder({ kind: "user", id: "u1" }, sources).label).toBe(
			"alice",
		);
	});
	test("a service account resolves to its name and slug", () => {
		expect(
			resolveHolder({ kind: "serviceaccount", id: "s1" }, sources),
		).toEqual({
			kind: "serviceaccount",
			id: "s1",
			label: "CI bot",
			serviceAccountName: "ci-bot",
		});
	});
	test("an unknown holder falls back to a short id", () => {
		const view = resolveHolder(
			{ kind: "serviceaccount", id: "0192f0aa-bbbb-7ccc" },
			sources,
		);
		expect(view.label).toBe("0192f0aa…");
		expect(view.serviceAccountName).toBeUndefined();
	});
});

describe("payload logging choice", () => {
	test("omitted reads as inherit and inherit writes omitted", () => {
		expect(toPayloadLoggingChoice(undefined)).toBe("inherit");
		expect(fromPayloadLoggingChoice("inherit")).toBeUndefined();
		expect(fromPayloadLoggingChoice("off")).toBe("off");
	});
});

describe("canSetPayloadLogging", () => {
	const member = {
		metadata: { name: "m", owner: { kind: "team" as const, id: "t1" } },
		spec: {
			kind: "member" as const,
			holder: { kind: "user" as const, id: "u1" },
		},
	};
	const caller = { isAdmin: false, userId: "u2", scopes: ["team:t1"] };

	test("an admin always may", () => {
		expect(
			canSetPayloadLogging(member, { ...caller, isAdmin: true, scopes: [] }),
		).toBe(true);
	});
	test("the holder may not", () => {
		expect(canSetPayloadLogging(member, { ...caller, userId: "u1" })).toBe(
			false,
		);
	});
	test("a member of the owning team is offered it", () => {
		expect(canSetPayloadLogging(member, caller)).toBe(true);
		expect(
			canSetPayloadLogging(member, { ...caller, scopes: ["team:t9"] }),
		).toBe(false);
	});
	test("personal accounts are admin-only", () => {
		const personal = {
			metadata: { name: "p", owner: { kind: "user" as const, id: "u1" } },
			spec: {
				kind: "personal" as const,
				holder: { kind: "user" as const, id: "u1" },
			},
		};
		expect(canSetPayloadLogging(personal, caller)).toBe(false);
	});
});
