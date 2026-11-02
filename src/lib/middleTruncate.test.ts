import { describe, expect, test } from "bun:test";
import { middleTruncate } from "./middleTruncate";

describe("middleTruncate", () => {
	test("cuts a long id in the middle", () => {
		expect(middleTruncate("ed468e69-e432-41a6-9c09-e65615b6f629")).toBe(
			"ed468e69…f629",
		);
	});
	test("leaves a short id whole", () => {
		expect(middleTruncate("org-abc123")).toBe("org-abc123");
	});
});
