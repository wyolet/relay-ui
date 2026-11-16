import { describe, expect, it } from "bun:test";
import {
	filterByOrigin,
	HOST_OWNED,
	matchesOwnerFilter,
	OTHER_OWNERS,
	onOrigins,
	ownerFilterKey,
	ownerFilterOptions,
	ownerFilterSummary,
} from "@/lib/ownerFilter";
import type { WorkContext } from "@/lib/workContext";

const contexts: WorkContext[] = [
	{ kind: "personal", id: "me", displayName: "me", admin: true },
	{ kind: "team", id: "t1", displayName: "Platform", admin: true },
	{
		kind: "project",
		id: "p1",
		displayName: "Search",
		teamId: "t1",
		admin: false,
	},
];
const listed = new Set(["personal:me", "team:t1", "project:p1"]);

describe("ownerFilterKey", () => {
	it("keys rows by the context they sit in", () => {
		expect(ownerFilterKey({ kind: "team", id: "t1" }, "me")).toBe("team:t1");
		expect(ownerFilterKey({ kind: "user", id: "me" }, "me")).toBe(
			"personal:me",
		);
		expect(ownerFilterKey(undefined, "me")).toBe("personal:me");
		expect(ownerFilterKey({ kind: "system" }, "me")).toBe("system");
		expect(ownerFilterKey({ kind: "organization" }, "me")).toBe(
			"organization:",
		);
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

describe("filterByOrigin", () => {
	const rows = [
		{ metadata: { owner: { kind: "user" as const, id: "me" } } },
		{ metadata: { owner: { kind: "team" as const, id: "t1" } } },
		{ metadata: { owner: { kind: "system" as const } } },
		{ metadata: { owner: { kind: "host" as const, id: "h1" } } },
	];
	const onlyMine = (r: (typeof rows)[number]) =>
		r.metadata.owner.kind === "user";
	it("the owner filter narrows custom rows only", () => {
		expect(
			filterByOrigin(rows, ["custom", "system"], onlyMine).map(
				(r) => r.metadata.owner.kind,
			),
		).toEqual(["user", "system"]);
		expect(filterByOrigin(rows, [], onlyMine)).toHaveLength(3);
	});
});

describe("onOrigins", () => {
	const preset = { kind: "host" as const, id: "h1" };
	const team = { kind: "team" as const, id: "t1" };
	it("system rows are their own origin", () => {
		const system = { kind: "system" as const };
		expect(onOrigins(system, ["custom"])).toBe(false);
		expect(onOrigins(system, ["system"])).toBe(true);
	});
	it("custom keeps relay-made rows, provider keeps catalog presets", () => {
		expect(onOrigins(team, ["custom"])).toBe(true);
		expect(onOrigins(preset, ["custom"])).toBe(false);
		expect(onOrigins(preset, ["provider"])).toBe(true);
		expect(onOrigins(undefined, ["custom"])).toBe(true);
	});
	it("none picked takes both", () => {
		expect(onOrigins(preset, [])).toBe(true);
		expect(onOrigins(team, [])).toBe(true);
	});
});
