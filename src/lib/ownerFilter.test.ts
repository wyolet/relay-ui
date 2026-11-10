import { describe, expect, it } from "bun:test";
import {
	HOST_OWNED,
	matchesOwnerFilter,
	OTHER_OWNERS,
	ownerFilterKey,
	ownerFilterOptions,
	ownerFilterSummary,
} from "@/lib/ownerFilter";
import type { WorkContext } from "@/lib/workContext";

const contexts: WorkContext[] = [
	{ kind: "personal", id: "me", displayName: "me" },
	{ kind: "team", id: "t1", displayName: "Platform" },
	{ kind: "project", id: "p1", displayName: "Search", teamId: "t1" },
];
const listed = new Set(["personal:me", "team:t1", "project:p1"]);

describe("ownerFilterKey", () => {
	it("keys rows by the context they sit in", () => {
		expect(ownerFilterKey({ kind: "team", id: "t1" }, "me")).toBe("team:t1");
		expect(ownerFilterKey({ kind: "user", id: "me" }, "me")).toBe(
			"personal:me",
		);
		expect(ownerFilterKey(undefined, "me")).toBe("personal:me");
		expect(ownerFilterKey({ kind: "system" }, "me")).toBe("system:");
	});

	it("puts host and provider rows in one bucket", () => {
		expect(ownerFilterKey({ kind: "host", id: "h" }, "me")).toBe(HOST_OWNED);
		expect(ownerFilterKey({ kind: "provider", id: "p" }, "me")).toBe(
			HOST_OWNED,
		);
	});
});

describe("ownerFilterOptions", () => {
	it("lists contexts, then only the buckets some row falls in", () => {
		const options = ownerFilterOptions(
			contexts,
			new Set(["team:t1", HOST_OWNED, "personal:someone-else"]),
		);
		expect(options.map((o) => o.label)).toEqual([
			"Personal",
			"Team Platform",
			"Project Search",
			"Host presets",
			"Other owners",
		]);
		expect(ownerFilterOptions(contexts, new Set(["team:t1"]))).toHaveLength(3);
	});
});

describe("matchesOwnerFilter", () => {
	it("passes every row with nothing selected", () => {
		expect(matchesOwnerFilter(HOST_OWNED, [], listed)).toBe(true);
	});

	it("keeps only the selected owners", () => {
		expect(matchesOwnerFilter("team:t1", ["team:t1"], listed)).toBe(true);
		expect(matchesOwnerFilter("project:p1", ["team:t1"], listed)).toBe(false);
	});

	it("matches unlisted owners under Other, but not host rows", () => {
		expect(matchesOwnerFilter("personal:x", [OTHER_OWNERS], listed)).toBe(true);
		expect(matchesOwnerFilter(HOST_OWNED, [OTHER_OWNERS], listed)).toBe(false);
		expect(matchesOwnerFilter("team:t1", [OTHER_OWNERS], listed)).toBe(false);
	});
});

describe("ownerFilterSummary", () => {
	const options = ownerFilterOptions(contexts, new Set());
	it("names one owner, counts several, says All for none", () => {
		expect(ownerFilterSummary([], options)).toBe("All");
		expect(ownerFilterSummary(["team:t1"], options)).toBe("Team Platform");
		expect(ownerFilterSummary(["team:t1", "project:p1"], options)).toBe(
			"2 owners",
		);
	});
});
