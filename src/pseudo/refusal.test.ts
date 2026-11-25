import { describe, expect, it } from "bun:test";
import { PseudoRefusal, type PseudoRefusalBody } from "@/api/types/errors";
import {
	BUSY_MESSAGE,
	CONFLICT_MESSAGE,
	isBusy,
	isPolicySetAbove,
	parseRefusal,
	sameAnswers,
} from "@/pseudo/refusal";

const FIELDS = { "/spec/ids": "ids", "/metadata": "name" } as const;

function refused(
	status: number,
	body: Partial<PseudoRefusalBody>,
	code?: string,
) {
	return new PseudoRefusal(status, {
		error: { type: "invalid_request_error", message: "relay says no", code },
		...body,
	});
}

describe("parseRefusal", () => {
	it("puts a refusal without a code by the field its pointer names", () => {
		expect(
			parseRefusal(refused(403, { pointer: "/spec/ids/1" }), FIELDS),
		).toEqual({ kind: "field", field: "ids", message: "relay says no" });
	});

	it("keeps a refusal without a known pointer general", () => {
		expect(parseRefusal(refused(403, {}), FIELDS)).toEqual({
			kind: "general",
			message: "relay says no",
		});
		expect(parseRefusal(new Error("offline"), FIELDS)).toEqual({
			kind: "general",
			message: "offline",
		});
	});

	it("asks for a retry on a conflict and while relay is busy", () => {
		expect(
			parseRefusal(refused(409, { pointer: "/metadata" }, "conflict"), FIELDS),
		).toEqual({ kind: "general", message: CONFLICT_MESSAGE });
		expect(parseRefusal(refused(503, {}), FIELDS)).toEqual({
			kind: "general",
			message: BUSY_MESSAGE,
		});
	});

	it("never puts a 503 by a field, even with a pointer", () => {
		expect(
			parseRefusal(refused(503, { pointer: "/spec/ids/0" }), FIELDS),
		).toEqual({ kind: "general", message: BUSY_MESSAGE });
	});

	it("puts another 409 by its field with relay's message", () => {
		expect(
			parseRefusal(
				refused(409, { pointer: "/metadata" }, "organization_taken"),
				FIELDS,
			),
		).toEqual({ kind: "field", field: "name", message: "relay says no" });
	});

	it("keeps the account an organization_taken offers instead", () => {
		const taken = new PseudoRefusal(409, {
			error: {
				type: "conflict_error",
				message: "relay says no",
				code: "organization_taken",
			},
			pointer: "/metadata",
			account: { id: "acct-1", name: "acme" },
		});
		expect(parseRefusal(taken, FIELDS)).toEqual({
			kind: "field",
			field: "name",
			message: "relay says no",
			account: { id: "acct-1", name: "acme" },
		});
	});

	it("reads a plan_issue with no issues by its pointer", () => {
		expect(
			parseRefusal(
				refused(422, { pointer: "/spec/ids", issues: [] }, "plan_issue"),
				FIELDS,
			),
		).toEqual({ kind: "field", field: "ids", message: "relay says no" });
	});
});

describe("isBusy", () => {
	it("is relay's 503 and nothing else", () => {
		expect(isBusy(refused(503, {}))).toBe(true);
		expect(isBusy(refused(409, {}, "conflict"))).toBe(false);
		expect(isBusy(new Error("offline"))).toBe(false);
	});
});

describe("isPolicySetAbove", () => {
	it("is relay's 403 for a policy set above the caller", () => {
		const above = new PseudoRefusal(403, {
			error: {
				type: "permission_error",
				code: "policy_set_above",
				message: "set by the organization",
			},
			pointer: "/spec/target",
		});
		expect(isPolicySetAbove(above)).toBe(true);
		expect(
			isPolicySetAbove(
				new PseudoRefusal(404, {
					error: { type: "not_found_error", message: "no such team" },
					pointer: "/spec/target",
				}),
			),
		).toBe(false);
		expect(isPolicySetAbove(new Error("offline"))).toBe(false);
	});
});

describe("sameAnswers", () => {
	const at = { name: "a", ids: ["1", "2"], on: false };

	it("compares only the named answers, lists by value", () => {
		expect(
			sameAnswers({ ...at, ids: ["1", "2"], on: true }, at, ["name", "ids"]),
		).toBe(true);
		expect(sameAnswers({ ...at, ids: ["2", "1"] }, at, ["ids"])).toBe(false);
	});
});
