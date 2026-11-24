import { describe, expect, it } from "bun:test";
import {
	agentRefusal,
	CONFLICT_MESSAGE,
	HIDDEN_ROW_ISSUE,
	pointerField,
	STARTING_MESSAGE,
} from "@/agents/agentRefusal";
import { PseudoRefusal, type PseudoRefusalBody } from "@/api/types/errors";

describe("pointerField", () => {
	it("maps each part of the body to the field that holds it", () => {
		expect(pointerField("/metadata")).toBe("displayName");
		expect(pointerField("/metadata/name")).toBe("displayName");
		expect(pointerField("/spec/access/accountIds/0")).toBe("accountIds");
		expect(pointerField("/spec/access/accountIds")).toBe("accountIds");
		expect(pointerField("/spec/access/poolIds/2")).toBe("poolIds");
		expect(pointerField("/spec/access")).toBe("access");
		expect(pointerField("/spec/access/models")).toBe("access");
		expect(pointerField("/spec/policyId")).toBe("policyId");
		expect(pointerField("/spec/key")).toBe("keyName");
	});

	it("names no field for an empty or unknown pointer, or a prefix lookalike", () => {
		expect(pointerField("")).toBeUndefined();
		expect(pointerField("/spec")).toBeUndefined();
		expect(pointerField("/spec/accessories")).toBeUndefined();
	});
});

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

describe("agentRefusal", () => {
	it("puts a pointed refusal by its field with relay's message", () => {
		expect(
			agentRefusal(refused(400, { pointer: "/spec/access/accountIds/0" })),
		).toEqual({
			kind: "field",
			field: "accountIds",
			message: "relay says no",
		});
	});

	it("keeps a refusal without a known pointer general", () => {
		expect(agentRefusal(refused(403, {}))).toEqual({
			kind: "general",
			message: "relay says no",
		});
		expect(agentRefusal(new Error("offline"))).toEqual({
			kind: "general",
			message: "offline",
		});
	});

	it("asks for a retry on a conflict and while relay starts", () => {
		expect(
			agentRefusal(refused(409, { pointer: "/metadata" }, "conflict")),
		).toEqual({
			kind: "general",
			message: CONFLICT_MESSAGE,
		});
		expect(agentRefusal(refused(503, {}))).toEqual({
			kind: "general",
			message: STARTING_MESSAGE,
		});
	});

	it("lists plan issues by field, hiding rows the caller can't see", () => {
		const refusal = refused(
			422,
			{
				issues: [
					{
						code: "no_route",
						kind: "policy",
						message: "serves nothing",
						pointer: "/spec/access",
					},
					{ code: "no_route", kind: "policy", message: "" },
				],
			},
			"plan_issue",
		);
		expect(agentRefusal(refusal)).toEqual({
			kind: "issues",
			issues: [
				{ field: "access", message: "serves nothing" },
				{ message: HIDDEN_ROW_ISSUE },
			],
		});
	});
});
