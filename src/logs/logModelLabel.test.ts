import { describe, expect, test } from "bun:test";
import { logModelLabel } from "./logModelLabel";

describe("logModelLabel", () => {
	test("prefers the catalog name, then the id, then the requested model", () => {
		expect(logModelLabel({ model_id: "m1" }, () => "GPT-4o Mini")).toBe(
			"GPT-4o Mini",
		);
		expect(logModelLabel({ model_id: "m1" }, () => undefined)).toBe("m1");
		expect(logModelLabel({ requested_model: "openai/gpt-4o" }, undefined)).toBe(
			"openai/gpt-4o",
		);
	});

	test("shows a dash when the request was refused before naming a model", () => {
		expect(logModelLabel({}, undefined)).toBe("—");
	});
});
