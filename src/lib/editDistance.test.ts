import { describe, expect, it } from "bun:test";
import { editDistance } from "./editDistance";

describe("editDistance", () => {
	it("counts inserts, deletes and substitutions", () => {
		expect(editDistance("", "abc")).toBe(3);
		expect(editDistance("abc", "")).toBe(3);
		expect(editDistance("same", "same")).toBe(0);
		expect(editDistance("kitten", "sitting")).toBe(3);
		expect(editDistance("gpt-4o", "gpt-4.o")).toBe(1);
	});
});
