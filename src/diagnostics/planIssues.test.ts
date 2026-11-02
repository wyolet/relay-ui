import { describe, expect, it } from "bun:test";
import type { PlanIssue } from "@/api/hooks/planIssues";
import { planIssueDiagnostic } from "@/diagnostics/planIssues";

const issue = (o: Partial<PlanIssue>): PlanIssue => ({
	code: "ref_missing",
	message: "Pool is gone.",
	kind: "policy",
	id: "p1",
	name: "team",
	severity: "error",
	refs: [],
	...o,
});

describe("planIssueDiagnostic", () => {
	it("maps severity and prefixes the code", () => {
		const d = planIssueDiagnostic(issue({ severity: "warning" }));
		expect(d.severity).toBe("warn");
		expect(d.code).toBe("plan.ref_missing");
		expect(d.link).toBeUndefined();
	});

	it("links the first ref the UI has a page for, by id", () => {
		const d = planIssueDiagnostic(
			issue({
				refs: [
					{ kind: "keyslot", id: "x" },
					{ kind: "pool", id: "pool-1" },
				],
			}),
		);
		expect(d.link).toEqual({ to: "/pools/$name", params: { name: "pool-1" } });
	});

	it("skips a ref whose id the caller may not see", () => {
		const d = planIssueDiagnostic(issue({ refs: [{ kind: "pool", id: "" }] }));
		expect(d.link).toBeUndefined();
	});
});
