import { describe, expect, test } from "bun:test";
import {
	keepAcrossScopes,
	onlyScopeDiffers,
	usableList,
} from "@/api/hooks/usableList";

const teamPools = ["pools", "list", { usable_by: "team:t1" }] as const;
const userPools = ["pools", "list", { usable_by: "user:u1" }] as const;

describe("onlyScopeDiffers", () => {
	test("the same list for another scope", () => {
		expect(onlyScopeDiffers(userPools, teamPools)).toBe(true);
		expect(
			onlyScopeDiffers(
				["accounts", "list", { usable_by: "user:u1", usable_for: "pool" }],
				["accounts", "list", { usable_by: "system" }],
			),
		).toBe(true);
	});

	test("another filter is another list", () => {
		expect(
			onlyScopeDiffers(
				["pools", "list", { usable_by: "user:u1", host_id: ["h1"] }],
				["pools", "list", { usable_by: "team:t1", host_id: ["h2"] }],
			),
		).toBe(false);
	});

	test("the same key isn't a scope change", () => {
		expect(onlyScopeDiffers(teamPools, teamPools)).toBe(false);
	});
});

describe("keepAcrossScopes", () => {
	const rows = { items: ["a"] };

	test("keeps the last scope's rows", () => {
		expect(keepAcrossScopes(teamPools)(rows, { queryKey: userPools })).toBe(
			rows,
		);
	});

	test("starts empty on any other change", () => {
		const otherHost = [
			"pools",
			"list",
			{ usable_by: "user:u1", host_id: ["h2"] },
		];
		expect(
			keepAcrossScopes(otherHost)(rows, { queryKey: userPools }),
		).toBeUndefined();
		expect(keepAcrossScopes(teamPools)(undefined, undefined)).toBeUndefined();
	});
});

describe("usableList", () => {
	test("reads rows, load state and placeholder", () => {
		expect(
			usableList({ data: { items: ["a"] }, isPlaceholderData: true }),
		).toEqual({ items: ["a"], loaded: true, fromPreviousScope: true });
		expect(
			usableList({ data: { items: null }, isPlaceholderData: false }),
		).toEqual({ items: [], loaded: true, fromPreviousScope: false });
		expect(usableList({ data: undefined, isPlaceholderData: false })).toEqual({
			items: [],
			loaded: false,
			fromPreviousScope: false,
		});
	});
});
