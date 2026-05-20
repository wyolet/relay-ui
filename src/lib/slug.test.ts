import { describe, expect, test } from "bun:test";
import { from, MAX_LEN, valid, withSuffix } from "@/lib/slug";

describe("slug.from — must match Go pkg/slug.From", () => {
	const cases: [string, string][] = [
		["gpt-5.5", "gpt-5-5"],
		["GPT-5.5", "gpt-5-5"],
		["ollama/llama2:7b", "ollama-llama2-7b"],
		["ft:gpt-3.5-turbo", "ft-gpt-3-5-turbo"],
		["meta-llama/Llama-3.1-8B", "meta-llama-llama-3-1-8b"],
		["-foo-", "foo"],
		["***", ""],
	];
	for (const [input, expected] of cases) {
		test(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
			expect(from(input)).toBe(expected);
		});
	}

	test("trims to MAX_LEN and strips trailing dash", () => {
		const input = `${"a".repeat(70)}-`;
		const out = from(input);
		expect(out.length).toBeLessThanOrEqual(MAX_LEN);
		expect(out.endsWith("-")).toBe(false);
		expect(out).toBe("a".repeat(63));
	});

	test("non-alnum at the boundary becomes a single interior dash", () => {
		expect(from("a   b")).toBe("a-b");
		expect(from("--a--b--")).toBe("a-b");
	});
});

describe("slug.valid", () => {
	test("accepts canonical labels", () => {
		expect(valid("gpt-4o")).toBe(true);
		expect(valid("a")).toBe(true);
		expect(valid("a1")).toBe(true);
	});
	test("rejects dots, colons, uppercase, edge dashes", () => {
		expect(valid("gpt-5.5")).toBe(false);
		expect(valid("ollama:7b")).toBe(false);
		expect(valid("GPT-4")).toBe(false);
		expect(valid("-foo")).toBe(false);
		expect(valid("foo-")).toBe(false);
		expect(valid("")).toBe(false);
	});
});

describe("slug.withSuffix", () => {
	test("appends -N within MAX_LEN", () => {
		expect(withSuffix("foo", 2)).toBe("foo-2");
	});
	test("trims base + dash when needed", () => {
		const longBase = "a".repeat(MAX_LEN);
		const out = withSuffix(longBase, 12);
		expect(out.length).toBeLessThanOrEqual(MAX_LEN);
		expect(out.endsWith("-12")).toBe(true);
	});
});
