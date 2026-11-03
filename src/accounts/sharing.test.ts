import { describe, expect, test } from "bun:test";
import {
	accountLabel,
	isSharedAccount,
	partyName,
	sharedByName,
} from "@/accounts/accountView";
import {
	canShareAccount,
	parseReceiverKind,
	shareConflictMessage,
	shareUsageText,
} from "@/accounts/sharing";
import type { Account } from "@/api/hooks/accounts";
import { ApiError } from "@/api/types/errors";
import type { ScopeCaller } from "@/lib/ownership";

function provider(
	owner: NonNullable<Account["metadata"]["owner"]>,
	spec: Partial<Account["spec"]> = {},
): Account {
	return {
		metadata: { name: "anthropic", owner },
		spec: { kind: "provider", hostId: "h1", ...spec },
	};
}

const caller: ScopeCaller = {
	isAdmin: false,
	userId: "u1",
	adminScopes: ["team:t1"],
};

describe("isSharedAccount", () => {
	test("an account with a source is shared", () => {
		expect(
			isSharedAccount(
				provider({ kind: "team", id: "t2" }, { sourceAccountId: "a1" }),
			),
		).toBe(true);
		expect(isSharedAccount(provider({ kind: "user", id: "u1" }))).toBe(false);
	});
});

describe("sharedByName", () => {
	const shared = provider(
		{ kind: "team", id: "t2" },
		{
			sourceAccountId: "a1",
			sharedBy: { kind: "user", id: "u1", name: "Alice" },
		},
	);
	test("names who shared it, also in the account's label", () => {
		expect(sharedByName(shared)).toBe("Alice");
		expect(accountLabel(shared)).toBe("Provider · anthropic · shared by Alice");
	});
	test("is unset on a real account", () => {
		const real = provider({ kind: "user", id: "u1" });
		expect(sharedByName(real)).toBeUndefined();
		expect(accountLabel(real)).toBe("Provider · anthropic");
	});
});

describe("partyName", () => {
	test("system, a named party, and one the caller can't see", () => {
		expect(partyName({ kind: "system" })).toBe("System");
		expect(partyName({ kind: "team", id: "t1", name: "platform" })).toBe(
			"platform",
		);
		expect(partyName({ kind: "user", id: "0192f0aa-bbbb" })).toBe("0192f0aa…");
	});
});

describe("canShareAccount", () => {
	test("a personal account's user shares it", () => {
		expect(canShareAccount(provider({ kind: "user", id: "u1" }), caller)).toBe(
			true,
		);
		expect(canShareAccount(provider({ kind: "user", id: "u9" }), caller)).toBe(
			false,
		);
	});
	test("a team or project account takes an admin of it or the system", () => {
		expect(canShareAccount(provider({ kind: "team", id: "t1" }), caller)).toBe(
			true,
		);
		expect(
			canShareAccount(provider({ kind: "project", id: "p1" }), caller),
		).toBe(false);
		expect(
			canShareAccount(provider({ kind: "project", id: "p1" }), {
				...caller,
				isAdmin: true,
			}),
		).toBe(true);
	});
	test("a system account takes an admin", () => {
		expect(canShareAccount(provider({ kind: "system" }), caller)).toBe(false);
		expect(
			canShareAccount(provider({ kind: "system" }), {
				...caller,
				isAdmin: true,
			}),
		).toBe(true);
	});
	test("a shared account is never shared on", () => {
		expect(
			canShareAccount(
				provider({ kind: "user", id: "u1" }, { sourceAccountId: "a1" }),
				{ ...caller, isAdmin: true },
			),
		).toBe(false);
	});
	test("only provider accounts are shared", () => {
		const personal: Account = {
			metadata: { name: "me", owner: { kind: "user", id: "u1" } },
			spec: { kind: "personal" },
		};
		expect(canShareAccount(personal, caller)).toBe(false);
	});
});

describe("shareUsageText", () => {
	test("requests and cost", () => {
		expect(
			shareUsageText({ requests: 4, costNanos: 2_500_000_000, unpriced: 0 }),
		).toMatch(/^4 req · .*2[.,]50/);
	});
	test("unpriced traffic never reads as $0", () => {
		expect(shareUsageText({ requests: 3, costNanos: 0, unpriced: 3 })).toBe(
			"3 req · —",
		);
	});
	test("no usage reader", () => {
		expect(shareUsageText(undefined)).toBe("—");
	});
});

describe("shareConflictMessage", () => {
	test("share_exists and reshare_refused carry the server's message", () => {
		const err = new ApiError(409, {
			type: "invalid_request_error",
			code: "share_exists",
			message: "already shared with team platform",
		});
		expect(shareConflictMessage(err)).toBe("already shared with team platform");
	});
	test("other errors are left to the caller", () => {
		expect(
			shareConflictMessage(
				new ApiError(409, {
					type: "invalid_request_error",
					code: "resource_in_use",
					message: "x",
				}),
			),
		).toBeUndefined();
		expect(shareConflictMessage(new Error("x"))).toBeUndefined();
	});
});

test("parseReceiverKind", () => {
	expect(parseReceiverKind("serviceaccount")).toBe("serviceaccount");
	expect(parseReceiverKind("system")).toBeUndefined();
});
