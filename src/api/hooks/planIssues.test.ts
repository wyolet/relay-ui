import { describe, expect, it } from "bun:test";
import {
	issuesByObject,
	objectRef,
	type PlanIssue,
} from "@/api/hooks/planIssues";

const issue = (o: Partial<PlanIssue>): PlanIssue => ({
	code: "rate_limit_disabled",
	message: "rate limit rl is disabled; it does not apply to this policy",
	kind: "policy",
	id: "p1",
	name: "team",
	field: "spec.rateLimits[0]",
	severity: "warning",
	refs: [],
	...o,
});

describe("objectRef", () => {
	it("joins kind and id the way relay's about filter reads them", () => {
		expect(objectRef("pool", "abc")).toBe("pool:abc");
	});
});

describe("issuesByObject", () => {
	it("files an issue under its own object and each object it names", () => {
		const rl = issue({ refs: [{ kind: "ratelimit", id: "r1", name: "rl" }] });
		const byObject = issuesByObject([rl]);
		expect(byObject.get("policy:p1")).toEqual([rl]);
		expect(byObject.get("ratelimit:r1")).toEqual([rl]);
	});

	it("skips refs the caller may not see", () => {
		const byObject = issuesByObject([
			issue({ refs: [{ kind: "ratelimit", id: "", name: "" }] }),
		]);
		expect([...byObject.keys()]).toEqual(["policy:p1"]);
	});

	it("files an issue once per object, keeping order", () => {
		const first = issue({ refs: [{ kind: "policy", id: "p1", name: "team" }] });
		const second = issue({ code: "model_ref_disabled" });
		const byObject = issuesByObject([first, second]);
		expect(byObject.get("policy:p1")).toEqual([first, second]);
	});

	it("is empty without issues", () => {
		expect(issuesByObject([]).size).toBe(0);
	});
});
