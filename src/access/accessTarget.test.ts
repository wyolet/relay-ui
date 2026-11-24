import { describe, expect, it } from "bun:test";
import { type AccessTargetRow, accessTarget } from "@/access/accessTarget";

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

	it("scopes a service account to its owner", () => {
		const scoped = (scope: AccessTargetRow["scope"]) =>
			accessTarget(
				"serviceaccount",
				{ metadata: { id: "sa1", name: "indexer" }, scope },
				"acct-sa1",
			);
		expect(scoped({ kind: "project", id: "p1" })).toMatchObject({
			label: "indexer",
			scope: { kind: "project", id: "p1" },
			scopeLabel: "indexer's project",
		});
		expect(scoped({ kind: "team", id: "t1" })).toMatchObject({
			scope: { kind: "team", id: "t1" },
			scopeLabel: "indexer's team",
		});
		expect(scoped({ kind: "personal", id: "u1" })).toMatchObject({
			scope: { kind: "personal", id: "u1" },
			scopeLabel: "indexer's owner",
		});
	});

	it("has none without an id, or a service account without an owner", () => {
		expect(
			accessTarget("project", { metadata: { name: "x" } }, "a"),
		).toBeUndefined();
		expect(
			accessTarget("serviceaccount", { metadata: { id: "s", name: "s" } }, "a"),
		).toBeUndefined();
	});
});
