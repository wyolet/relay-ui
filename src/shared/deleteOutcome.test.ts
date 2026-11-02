import { describe, expect, test } from "bun:test";
import {
	blockerKindLabel,
	deletedMessage,
	detachedSummary,
} from "@/shared/deleteOutcome";

describe("detachedSummary", () => {
	test("is null when nothing was unlinked", () => {
		expect(detachedSummary([])).toBeNull();
		expect(detachedSummary([{ field: "spec.budgetIds", policies: [] }])).toBe(
			null,
		);
	});

	test("names one policy", () => {
		expect(
			detachedSummary([{ field: "spec.budgetIds", policies: ["ci"] }]),
		).toBe("Unlinked from policy ci.");
	});

	test("dedupes names across fields and counts hidden ones", () => {
		expect(
			detachedSummary([
				{ field: "spec.poolIds", policies: ["ci", "prod"], hidden: 1 },
				{ field: "spec.credentialIds", policies: ["ci"] },
			]),
		).toBe("Unlinked from policies ci, prod and 1 you can't see.");
	});
});

describe("deletedMessage", () => {
	test("appends the summary when links were taken", () => {
		expect(
			deletedMessage("budget", "Monthly", [
				{ field: "spec.budgetIds", policies: ["ci"] },
			]),
		).toBe('Budget "Monthly" deleted. Unlinked from policy ci.');
	});

	test("is the bare message on a plain delete", () => {
		expect(deletedMessage("pool", "Main", [])).toBe('Pool "Main" deleted.');
	});
});

describe("blockerKindLabel", () => {
	test("maps known kinds and passes unknown ones through", () => {
		expect(blockerKindLabel("host-key")).toBe("Credentials");
		expect(blockerKindLabel("overlay")).toBe("overlay");
	});
});
