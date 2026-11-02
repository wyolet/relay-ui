import { describe, expect, it } from "bun:test";
import type { PlanIssue } from "@/api/hooks/planIssues";
import { planIssueAttention } from "./planIssueAttention";

const issue = (o: Partial<PlanIssue>): PlanIssue => ({
	code: "ref_missing",
	message: "a linked pool is gone",
	kind: "policy",
	id: "p1",
	name: "team",
	severity: "warning",
	refs: [],
	...o,
});

describe("planIssueAttention", () => {
	it("puts errors first and links each to its object", () => {
		const lines = planIssueAttention([
			issue({ id: "a" }),
			issue({ id: "b", kind: "pool", name: "main", severity: "error" }),
		]);
		expect(lines.map((l) => l.tone)).toEqual(["alert", "warn"]);
		expect(lines[0]?.text).toBe("Pool main: a linked pool is gone");
		expect(lines[0]?.target).toEqual({
			kind: "object",
			to: "/pools/$name",
			name: "main",
		});
	});

	it("leaves engine-internal kinds unlinked", () => {
		const [line] = planIssueAttention([issue({ kind: "keyslot", name: "" })]);
		expect(line?.target).toEqual({ kind: "none" });
		expect(line?.text).toBe("keyslot: a linked pool is gone");
	});

	it("folds everything past five into one count line", () => {
		const lines = planIssueAttention(
			Array.from({ length: 7 }, (_, i) => issue({ id: `p${i}` })),
		);
		expect(lines).toHaveLength(6);
		expect(lines[5]?.text).toBe("2 more configuration issues");
	});
});
