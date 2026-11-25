import { describe, expect, it } from "bun:test";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { ownPolicyCase, ownPolicyWrites } from "@/policy-bindings/ownPolicy";

const team = { kind: "team" as const, id: "t1" };

function policy(id: string, owner: Policy["metadata"]["owner"]): Policy {
	return { metadata: { id, name: id, owner }, spec: { enabled: true } };
}

function binding(policyId: string, accountIds: string[]): PolicyBinding {
	return {
		metadata: { id: `b-${policyId}`, name: `b-${policyId}` },
		spec: { policyId, accountIds },
	};
}

describe("ownPolicyCase", () => {
	it("creates when the account is bound to nothing", () => {
		expect(ownPolicyCase("a1", [], [], team)).toEqual({ kind: "create" });
	});

	it("updates the scope's own policy bound to this account alone", () => {
		const p = policy("p1", team);
		expect(ownPolicyCase("a1", [binding("p1", ["a1"])], [p], team)).toEqual({
			kind: "update",
			policy: p,
		});
	});

	it("copies a policy other accounts share", () => {
		const p = policy("p1", team);
		expect(
			ownPolicyCase("a1", [binding("p1", ["a1", "a2"])], [p], team),
		).toMatchObject({ kind: "copy", otherAccounts: 1, ownedElsewhere: false });
	});

	it("copies a preset the scope doesn't own", () => {
		const p = policy("p1", { kind: "host", id: "h1" });
		expect(
			ownPolicyCase("a1", [binding("p1", ["a1"])], [p], team),
		).toMatchObject({ kind: "copy", otherAccounts: 0, ownedElsewhere: true });
	});

	it("is above the caller when the holding binding's policy isn't visible", () => {
		expect(ownPolicyCase("a1", [binding("p9", ["a1"])], [], team)).toEqual({
			kind: "above",
			policyId: "p9",
		});
	});
});

describe("ownPolicyWrites", () => {
	const kinds = (c: Parameters<typeof ownPolicyWrites>[0]) =>
		ownPolicyWrites(c, "the team").map((w) => w.kind);

	it("orders the requests per case", () => {
		const p = policy("p1", team);
		expect(kinds({ kind: "create" })).toEqual(["policyCreate", "policyBind"]);
		expect(kinds({ kind: "update", policy: p })).toEqual(["policyUpdate"]);
		expect(
			kinds({
				kind: "copy",
				policy: p,
				otherAccounts: 1,
				ownedElsewhere: false,
			}),
		).toEqual(["policyCopy", "policyUpdate", "policyBind"]);
		expect(kinds({ kind: "above", policyId: "p9" })).toEqual([]);
	});
});
