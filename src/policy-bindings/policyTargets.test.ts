import { describe, expect, it } from "bun:test";
import type { Account } from "@/api/hooks/accounts";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import {
	boundAccountIds,
	targetChanges,
	targetFailureMessage,
	targetOptions,
} from "@/policy-bindings/policyTargets";

function account(id: string, kind: Account["spec"]["kind"]): Account {
	return {
		metadata: { id, name: id, displayName: id },
		spec: { kind },
	};
}

function binding(policyId: string, accountIds: string[]): PolicyBinding {
	return {
		metadata: { id: `b-${policyId}`, name: `b-${policyId}` },
		spec: { policyId, accountIds },
	};
}

const otherPolicy: Policy = {
	metadata: { id: "p2", name: "p2", displayName: "Default" },
	spec: {},
};

describe("boundAccountIds", () => {
	it("collects the accounts of every binding of the policy", () => {
		const bindings = [
			binding("p1", ["a", "b"]),
			binding("p2", ["c"]),
			binding("p1", ["d"]),
		];
		expect(boundAccountIds(bindings, "p1")).toEqual(["a", "b", "d"]);
	});
});

describe("targetChanges", () => {
	it("binds the new picks and unbinds the dropped ones", () => {
		expect(targetChanges(["a", "b"], ["b", "c"])).toEqual({
			add: ["c"],
			remove: ["a"],
		});
	});
});

describe("targetOptions", () => {
	it("names the policy a row moves from and keeps held rows the scope can't list", () => {
		const usable = [account("sa", "service"), account("team", "team")];
		const held = account("old", "project");
		const options = targetOptions({
			usable,
			all: [...usable, held],
			current: ["old"],
			bindings: [binding("p2", ["sa"]), binding("p1", ["old"])],
			policies: [otherPolicy],
			policyId: "p1",
		});
		expect(options).toEqual([
			{ value: "sa", label: "Service · sa · now uses Default" },
			{ value: "team", label: "Team · team" },
			{ value: "old", label: "Project · old" },
		]);
	});
});

describe("targetFailureMessage", () => {
	it("names each account that didn't follow", () => {
		expect(
			targetFailureMessage([{ accountId: "a", message: "forbidden" }], (id) =>
				id.toUpperCase(),
			),
		).toBe("Policy saved, but one account wasn't updated. A: forbidden");
	});
});
