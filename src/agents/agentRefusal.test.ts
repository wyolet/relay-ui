import { describe, expect, it } from "bun:test";
import { AGENT_POINTER_FIELDS } from "@/agents/agentRefusal";
import { PseudoRefusal, type PseudoRefusalBody } from "@/api/types/errors";
import { pointerField } from "@/pseudo/pointerField";
import { HIDDEN_ROW_ISSUE, parseRefusal } from "@/pseudo/refusal";

const field = (pointer: string) => pointerField(pointer, AGENT_POINTER_FIELDS);

describe("agent pointer fields", () => {
	it("maps each part of the body to the field that holds it", () => {
		expect(field("/metadata")).toBe("displayName");
		expect(field("/metadata/name")).toBe("displayName");
		expect(field("/metadata/owner")).toBe("owner");
		expect(field("/metadata/owner/id")).toBe("owner");
		expect(field("/spec/access/accountIds/0")).toBe("accountIds");
		expect(field("/spec/access/accountIds")).toBe("accountIds");
		expect(field("/spec/access/poolIds/2")).toBe("poolIds");
		expect(field("/spec/access")).toBe("access");
		expect(field("/spec/access/models")).toBe("access");
		expect(field("/spec/policyId")).toBe("policyId");
		expect(field("/spec/key")).toBe("keyName");
	});

	it("names no field for an empty or unknown pointer, or a prefix lookalike", () => {
		expect(field("")).toBeUndefined();
		expect(field("/spec")).toBeUndefined();
		expect(field("/spec/accessories")).toBeUndefined();
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

describe("agent refusal", () => {
	it("puts a pointed refusal by its field with relay's message", () => {
		expect(
			parseRefusal(
				refused(400, { pointer: "/spec/access/accountIds/0" }),
				AGENT_POINTER_FIELDS,
			),
		).toEqual({
			kind: "field",
			field: "accountIds",
			message: "relay says no",
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
		expect(parseRefusal(refusal, AGENT_POINTER_FIELDS)).toEqual({
			kind: "issues",
			issues: [
				{ field: "access", message: "serves nothing" },
				{ message: HIDDEN_ROW_ISSUE },
			],
		});
	});
});
