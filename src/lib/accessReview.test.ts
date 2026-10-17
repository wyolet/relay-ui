import { describe, expect, test } from "bun:test";
import { ApiError } from "@/api/types/errors";
import {
	type AccessReview,
	accessCheckFailure,
	describeChain,
	describeDecision,
	describeRef,
} from "@/lib/accessReview";

function review(over: Partial<AccessReview>): AccessReview {
	return {
		allowed: false,
		reason: "none",
		action: "keys.get",
		resource: { kind: "key", name: "ci-key" },
		subject: { kind: "user", name: "alice", admin: false },
		...over,
	};
}

describe("describeDecision", () => {
	test("allowed via a role binding names binding, role, scope and subject", () => {
		const r = review({
			allowed: true,
			reason: "binding",
			binding: {
				name: "ml-devs",
				role: { kind: "role", name: "developer" },
				scope: { kind: "project", name: "ml" },
				subject: { kind: "group", name: "eng" },
			},
		});
		expect(describeDecision(r)).toBe(
			"role binding ml-devs grants developer at project ml to group eng",
		);
	});

	test("a global binding reads global", () => {
		const r = review({
			allowed: true,
			reason: "binding",
			binding: {
				name: "ops",
				role: { kind: "role", name: "viewer" },
				scope: { kind: "system" },
				subject: { kind: "serviceaccount", name: "ci" },
			},
		});
		expect(describeDecision(r)).toBe(
			"role binding ops grants viewer at global to service account ci",
		);
	});

	test("allowed via a rule spells out the rule", () => {
		const r = review({ allowed: true, reason: "rule", rule: "personal-row" });
		expect(describeDecision(r)).toBe("relay rule: personal row");
	});

	test("denied with nothing granting it", () => {
		expect(describeDecision(review({}))).toBe(
			"no rule or role binding grants it",
		);
	});

	test("admin", () => {
		expect(
			describeDecision(
				review({
					allowed: true,
					reason: "admin",
					subject: { kind: "user", name: "root", admin: true },
				}),
			),
		).toBe("root is an admin, which passes every rule and role binding");
	});

	test("credential limits", () => {
		const r = review({
			reason: "credential",
			credentialDenied: true,
			rule: "scoped-list",
		});
		expect(describeDecision(r)).toBe(
			"relay rule: scoped list, but the credential's limits refuse it",
		);
	});
});

describe("describeRef / describeChain", () => {
	test("falls back to the id, then the bare kind", () => {
		expect(describeRef({ kind: "team", id: "t1" })).toBe("team t1");
		expect(describeRef({ kind: "keys" })).toBe("keys");
	});

	test("chain runs most specific first", () => {
		expect(
			describeChain([
				{ kind: "project", name: "ml" },
				{ kind: "team", name: "platform" },
				{ kind: "system" },
			]),
		).toBe("project ml → team platform → global");
		expect(describeChain(undefined)).toBe("");
	});
});

describe("accessCheckFailure", () => {
	const err = (status: number) =>
		new ApiError(status, { type: "x", message: `status ${status}` });

	test("501 means the relay runs single authz", () => {
		expect(accessCheckFailure(err(501))).toEqual({ kind: "needs-rbac" });
	});

	test("404 keeps the server's message", () => {
		expect(accessCheckFailure(err(404))).toEqual({
			kind: "not-found",
			message: "status 404",
		});
	});

	test("anything else is a plain failure", () => {
		expect(accessCheckFailure(err(403))).toEqual({
			kind: "other",
			message: "status 403",
		});
		expect(accessCheckFailure(null)).toBeUndefined();
	});
});
