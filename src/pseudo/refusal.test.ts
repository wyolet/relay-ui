import { describe, expect, it } from "bun:test";
import { PseudoRefusal, type PseudoRefusalBody } from "@/api/types/errors";
import { BUSY_MESSAGE, CONFLICT_MESSAGE, parseRefusal } from "@/pseudo/refusal";

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

	it("reads a plan_issue with no issues by its pointer", () => {
		expect(
			parseRefusal(
				refused(422, { pointer: "/spec/ids", issues: [] }, "plan_issue"),
				FIELDS,
			),
		).toEqual({ kind: "field", field: "ids", message: "relay says no" });
	});
});
