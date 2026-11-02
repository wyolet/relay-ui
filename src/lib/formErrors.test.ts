import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { firstError, zodFieldValidator } from "@/lib/formErrors";

describe("firstError", () => {
	test("returns the first string, skipping other error shapes", () => {
		expect(firstError([{ message: "x" }, "first", "second"])).toBe("first");
	});
	test("undefined when there is no string", () => {
		expect(firstError(undefined)).toBeUndefined();
		expect(firstError([42])).toBeUndefined();
	});
});

describe("zodFieldValidator", () => {
	const validate = zodFieldValidator<{ name: string; tags: string[] }>(
		z.object({
			name: z.string().min(1, "required").max(3, "too long"),
			tags: z.array(z.string().min(1, "empty tag")),
		}),
	);

	test("undefined when the value parses", () => {
		expect(validate({ value: { name: "ok", tags: [] } })).toBeUndefined();
	});
	test("keys issues by dotted path, first issue wins", () => {
		expect(validate({ value: { name: "", tags: ["a", ""] } })).toEqual({
			fields: { name: "required", "tags.1": "empty tag" },
		});
	});
});
