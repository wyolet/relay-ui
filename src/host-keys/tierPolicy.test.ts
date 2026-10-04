import { describe, expect, it } from "bun:test";
import { makeHost, makePolicy } from "@/diagnostics/fixtures";
import { defaultTierPolicyId, isHostTierPolicy } from "./tierPolicy";

const policy = (id: string, kind: string, ownerId: string) =>
	makePolicy({ id, name: id, owner: { kind, id: ownerId } });

const team = policy("p-team", "team", "t1");
const otherHost = policy("p-other", "host", "h2");
const tierA = policy("p-tier-a", "host", "h1");
const tierB = policy("p-tier-b", "host", "h1");

describe("isHostTierPolicy", () => {
	it("accepts only policies owned by that host", () => {
		expect(isHostTierPolicy(tierA, "h1")).toBe(true);
		expect(isHostTierPolicy(otherHost, "h1")).toBe(false);
		expect(isHostTierPolicy(team, "h1")).toBe(false);
	});
});

describe("defaultTierPolicyId", () => {
	const h1 = (defaultPolicy?: string) =>
		makeHost({ id: "h1", name: "h1", defaultPolicy });

	it("prefers the host's defaultPolicy id", () => {
		expect(defaultTierPolicyId(h1("p-tier-b"), [team, tierA, tierB])).toBe(
			"p-tier-b",
		);
	});

	it("never falls back to a team or another host's policy", () => {
		expect(defaultTierPolicyId(h1(), [team, otherHost, tierA])).toBe(
			"p-tier-a",
		);
		expect(defaultTierPolicyId(h1(), [team, otherHost])).toBeUndefined();
	});

	it("ignores a defaultPolicy that is not this host's tier", () => {
		expect(defaultTierPolicyId(h1("p-team"), [team, tierA])).toBe("p-tier-a");
	});
});
