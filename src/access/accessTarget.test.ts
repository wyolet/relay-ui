import { describe, expect, it } from "bun:test";
import { accessTarget } from "@/access/accessTarget";

describe("accessTarget", () => {
	it("scopes a team or project to itself", () => {
		expect(
			accessTarget(
				"team",
				{ metadata: { id: "t1", name: "platform", displayName: "Platform" } },
				"acct-t1",
			),
		).toEqual({
			kind: "team",
			id: "t1",
			name: "platform",
			label: "Platform",
			accountId: "acct-t1",
			scope: { kind: "team", id: "t1" },
			scopeLabel: "Platform",
		});
	});

	it("scopes a service account to its project", () => {
		expect(
			accessTarget(
				"serviceaccount",
				{ metadata: { id: "sa1", name: "indexer" }, projectId: "p1" },
				"acct-sa1",
			),
		).toMatchObject({
			label: "indexer",
			scope: { kind: "project", id: "p1" },
			scopeLabel: "indexer's project",
		});
	});

	it("has none without an id, or a service account without a project", () => {
		expect(
			accessTarget("project", { metadata: { name: "x" } }, "a"),
		).toBeUndefined();
		expect(
			accessTarget("serviceaccount", { metadata: { id: "s", name: "s" } }, "a"),
		).toBeUndefined();
	});
});
