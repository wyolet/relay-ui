import { describe, expect, it } from "bun:test";
import type { PlanIssue } from "@/api/hooks/planIssues";
import {
	planIssueDiagnostic,
	planIssueSubject,
} from "@/diagnostics/planIssues";

const issue = (o: Partial<PlanIssue>): PlanIssue => ({
	code: "ref_missing",
	message: "pool main does not exist; the link is ignored",
	kind: "policy",
	id: "p1",
	name: "team",
	field: "",
	severity: "error",
	refs: [],
	...o,
});

describe("planIssueDiagnostic", () => {
	it("maps severity, prefixes the code and keeps relay's message", () => {
		const d = planIssueDiagnostic(issue({ severity: "warning" }));
		expect(d.severity).toBe("warn");
		expect(d.code).toBe("plan.ref_missing");
		expect(d.message).toBe("pool main does not exist; the link is ignored");
		expect(d.link).toBeUndefined();
	});

	it("links the first ref the UI has a page for, by slug", () => {
		const d = planIssueDiagnostic(
			issue({
				refs: [
					{ kind: "keyslot", id: "x", name: "slot" },
					{ kind: "pool", id: "pool-1", name: "main" },
				],
			}),
		);
		expect(d.link).toEqual({ to: "/pools/$name", params: { name: "main" } });
	});

	it("leaves a ref the caller may not see unlinked", () => {
		const d = planIssueDiagnostic(
			issue({ refs: [{ kind: "pool", id: "", name: "" }] }),
		);
		expect(d.link).toBeUndefined();
	});

	it("on its own object's page, never links back to that object", () => {
		const d = planIssueDiagnostic(
			issue({ refs: [{ kind: "policy", id: "p1", name: "team" }] }),
			"policy:p1",
		);
		expect(d.message).toBe("pool main does not exist; the link is ignored");
		expect(d.link).toBeUndefined();
	});

	it("names and links the object carrying an issue shown on another page", () => {
		const d = planIssueDiagnostic(
			issue({
				code: "rate_limit_disabled",
				message: "rate limit rl is disabled; it does not apply to this policy",
				refs: [{ kind: "ratelimit", id: "r1", name: "rl" }],
			}),
			"ratelimit:r1",
		);
		expect(d.message).toBe(
			"Policy team: rate limit rl is disabled; it does not apply to this policy",
		);
		expect(d.link).toEqual({
			to: "/policies/$name",
			params: { name: "team" },
		});
	});
});

describe("planIssueSubject", () => {
	it("names the object by label and slug, or label alone", () => {
		expect(planIssueSubject(issue({ kind: "ratelimit", name: "rl" }))).toBe(
			"Rate limit rl",
		);
		expect(planIssueSubject(issue({ kind: "keyslot", name: "" }))).toBe(
			"keyslot",
		);
	});
});
