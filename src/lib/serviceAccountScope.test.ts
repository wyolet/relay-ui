import { describe, expect, it } from "bun:test";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import {
	serviceAccountScope,
	serviceAccountScopeOwner,
} from "@/lib/serviceAccountScope";

function sa(
	owner: ServiceAccount["metadata"]["owner"],
	spec: ServiceAccount["spec"] = {},
): ServiceAccount {
	return { metadata: { id: "sa1", name: "bot", owner }, spec };
}

describe("serviceAccountScope", () => {
	it("is the project, team or user that owns it", () => {
		expect(
			serviceAccountScope(
				sa({ kind: "project", id: "p1" }, { projectId: "p1" }),
			),
		).toEqual({ kind: "project", id: "p1" });
		expect(serviceAccountScope(sa({ kind: "team", id: "t1" }))).toEqual({
			kind: "team",
			id: "t1",
		});
		expect(serviceAccountScope(sa({ kind: "user", id: "u1" }))).toEqual({
			kind: "personal",
			id: "u1",
		});
	});

	it("reads the spec's owner ids when the owner names none", () => {
		expect(serviceAccountScope(sa(undefined, { projectId: "p1" }))).toEqual({
			kind: "project",
			id: "p1",
		});
		expect(serviceAccountScope(sa({ kind: "team" }, { teamId: "t1" }))).toEqual(
			{ kind: "team", id: "t1" },
		);
		expect(serviceAccountScope(sa(undefined, { userId: "u1" }))).toEqual({
			kind: "personal",
			id: "u1",
		});
	});

	it("has none without an owner id", () => {
		expect(serviceAccountScope(sa(undefined))).toBeUndefined();
		expect(
			serviceAccountScope(sa({ kind: "organization" }, {})),
		).toBeUndefined();
	});
});

describe("serviceAccountScopeOwner", () => {
	it("names the user of a personal scope", () => {
		expect(serviceAccountScopeOwner({ kind: "personal", id: "u1" })).toEqual({
			kind: "user",
			id: "u1",
		});
		expect(serviceAccountScopeOwner({ kind: "team", id: "t1" })).toEqual({
			kind: "team",
			id: "t1",
		});
	});
});
