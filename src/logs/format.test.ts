import { describe, expect, it } from "bun:test";
import { prettyBody, shortId } from "@/logs/format";

describe("prettyBody", () => {
	it("re-indents valid JSON", () => {
		expect(prettyBody('{"a":1,"b":[2,3]}')).toBe(
			'{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}',
		);
	});

	it("returns non-JSON strings verbatim", () => {
		expect(prettyBody("data: [DONE]")).toBe("data: [DONE]");
	});

	it("returns empty string for missing bodies", () => {
		expect(prettyBody(undefined)).toBe("");
		expect(prettyBody("")).toBe("");
	});
});

describe("shortId", () => {
	it("leaves short ids untouched", () => {
		expect(shortId("abc123")).toBe("abc123");
		expect(shortId("123456789012")).toBe("123456789012");
	});

	it("truncates long ids with an ellipsis", () => {
		expect(shortId("1234567890123456")).toBe("123456789012…");
	});
});
