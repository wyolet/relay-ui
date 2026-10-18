import { describe, expect, it } from "bun:test";
import { fmtLogTime, prettyBody, shortId } from "@/logs/format";

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

describe("fmtLogTime", () => {
	const now = new Date(2026, 9, 18, 15, 0, 0);
	it("drops the date for today and keeps it otherwise", () => {
		expect(fmtLogTime(new Date(2026, 9, 18, 9, 5, 7).toISOString(), now)).toBe(
			"09:05:07",
		);
		expect(
			fmtLogTime(new Date(2026, 9, 17, 23, 0, 0).toISOString(), now),
		).toMatch(/17.*23:00:00/);
	});
});
