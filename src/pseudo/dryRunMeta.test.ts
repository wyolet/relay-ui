import { describe, expect, it } from "bun:test";
import { DRY_RUN_META, writesNothing } from "@/pseudo/dryRunMeta";

describe("writesNothing", () => {
	it("is true only for a dry run's meta", () => {
		expect(writesNothing(DRY_RUN_META)).toBe(true);
		expect(writesNothing(undefined)).toBe(false);
		expect(writesNothing({})).toBe(false);
	});
});
