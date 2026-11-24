import { describe, expect, it } from "bun:test";
import {
	prefillRefusal,
	pseudoAccessBody,
	pseudoAccessTarget,
	pseudoCurrentLine,
	savedAccess,
	sentPoolIds,
	writesNothing,
} from "@/access/pseudoAccessBody";
import { PseudoRefusal } from "@/api/types/errors";

const team = { kind: "team", id: "t1" } as const;

describe("pseudoAccessTarget", () => {
	it("spells a service account as relay's target kind", () => {
		expect(pseudoAccessTarget({ kind: "serviceaccount", id: "sa-1" })).toEqual({
			kind: "service-account",
			id: "sa-1",
		});
		expect(pseudoAccessTarget({ kind: "project", id: "p1" })).toEqual({
			kind: "project",
			id: "p1",
		});
		expect(pseudoAccessTarget(team)).toEqual({ kind: "team", id: "t1" });
	});
});

describe("pseudoAccessBody", () => {
	const none = { poolIds: [], accountIds: [], models: [] };

	it("every credential states only that, with models when narrowed", () => {
		expect(
			pseudoAccessBody(team, {
				...none,
				everyCredential: true,
				poolIds: ["ignored"],
			}),
		).toEqual({
			spec: {
				target: { kind: "team", id: "t1" },
				access: { everyCredential: true },
			},
		});
		expect(
			pseudoAccessBody(team, {
				...none,
				everyCredential: true,
				models: ["google/gemma4-e4b"],
			}).spec.access,
		).toEqual({ everyCredential: true, models: ["google/gemma4-e4b"] });
	});

	it("names pools, then accounts, then models, leaving empty lists out", () => {
		expect(
			pseudoAccessBody(
				{ kind: "serviceaccount", id: "sa-1" },
				{
					everyCredential: false,
					poolIds: ["pool-kept", "pool-ollama"],
					accountIds: ["acct-1", "acct-2"],
					models: ["anthropic"],
				},
			),
		).toEqual({
			spec: {
				target: { kind: "service-account", id: "sa-1" },
				access: {
					everyCredential: false,
					poolIds: ["pool-kept", "pool-ollama"],
					accountIds: ["acct-1", "acct-2"],
					models: ["anthropic"],
				},
			},
		});
		expect(
			pseudoAccessBody(team, {
				...none,
				everyCredential: false,
				poolIds: ["p"],
			}).spec.access,
		).toEqual({ everyCredential: false, poolIds: ["p"] });
	});
});

describe("sentPoolIds", () => {
	it("keeps the current policy's order, then adds new picks in pick order", () => {
		expect(
			sentPoolIds(false, ["a", "b", "c"], ["new-2", "c", "a", "new-1"]),
		).toEqual(["a", "c", "new-2", "new-1"]);
	});

	it("links none with every credential", () => {
		expect(sentPoolIds(true, ["a"], ["a", "b"])).toEqual([]);
	});
});

describe("writesNothing", () => {
	const row = { kind: "policy", id: "p", name: "p" };

	it("is true for unchanged and for an answer listing no rows", () => {
		expect(writesNothing({ unchanged: true })).toBe(true);
		expect(writesNothing({})).toBe(true);
		expect(writesNothing({ created: [], updated: null })).toBe(true);
	});

	it("is false once any group lists a row", () => {
		expect(writesNothing({ updated: [row] })).toBe(false);
		expect(writesNothing({ deleted: [row] })).toBe(false);
		expect(writesNothing({ created: [row] })).toBe(false);
	});
});

describe("pseudoCurrentLine", () => {
	it("reads the case and the current policy", () => {
		expect(pseudoCurrentLine("none", undefined, "S team")).toBe(
			"No policy yet",
		);
		expect(pseudoCurrentLine("own", "s-team", "S team")).toBe("Policy s-team");
		expect(pseudoCurrentLine("copy", "shared", "S agent")).toBe(
			"Policy shared, shared or set elsewhere: saving makes a copy for S agent",
		);
	});
});

describe("savedAccess", () => {
	const policy = { id: "p1", name: "s-team-policy" };

	it("names the policy and what the save did to it", () => {
		expect(savedAccess({ case: "none", policy }, "S team")).toEqual({
			policyName: "s-team-policy",
			caseLine: "Made a policy.",
		});
		expect(savedAccess({ case: "own", policy }, "S team").caseLine).toBe(
			"Changed its policy.",
		);
		expect(
			savedAccess({ case: "copy", policy, hiddenPoolsKept: 2 }, "S agent"),
		).toEqual({
			policyName: "s-team-policy",
			caseLine: "Made a copy of the shared policy for S agent.",
			hiddenPoolsKept: 2,
		});
	});

	it("throws without a policy, which reads as a refusal", () => {
		expect(() => savedAccess({ case: "none" }, "S team")).toThrow();
	});
});

describe("prefillRefusal", () => {
	it("tells a policy set above from any other refusal", () => {
		const above = new PseudoRefusal(403, {
			error: {
				type: "invalid_request_error",
				code: "policy_set_above",
				message: "held by a policy of team team-alpha",
			},
			pointer: "/spec/target",
		});
		expect(prefillRefusal(above)).toEqual({
			above: true,
			message: "held by a policy of team team-alpha",
		});
		const missing = new PseudoRefusal(404, {
			error: { type: "invalid_request_error", message: "team not found" },
			pointer: "/spec/target/id",
		});
		expect(prefillRefusal(missing)).toEqual({
			above: false,
			message: "team not found",
		});
	});
});
