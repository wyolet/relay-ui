import { describe, expect, test } from "bun:test";
import {
	filterMyAccountRows,
	type MyAccountRow,
	toMyAccountRow,
} from "@/accounts/myAccountRows";
import type { MyAccount } from "@/api/hooks/accounts";

function myAccount(overrides: Partial<MyAccount> = {}): MyAccount {
	return {
		account: { id: "acc-1", name: "me", displayName: "", closed: false },
		kind: "personal",
		scope: { kind: "user", id: "u-1", name: "alice" },
		keys: null,
		tokenOnly: false,
		...overrides,
	};
}

describe("toMyAccountRow", () => {
	test("labels by slug when no display name is set", () => {
		const row = toMyAccountRow(myAccount());
		expect(row.label).toBe("me");
		expect(row.showName).toBe(false);
	});

	test("labels by display name and shows the slug under it", () => {
		const row = toMyAccountRow(
			myAccount({
				account: {
					id: "acc-2",
					name: "team-a-alice",
					displayName: "Team A",
					closed: true,
				},
			}),
		);
		expect(row).toMatchObject({
			id: "acc-2",
			name: "team-a-alice",
			label: "Team A",
			showName: true,
			closed: true,
		});
	});

	test("treats null keys as none and keeps policy and flags", () => {
		const row = toMyAccountRow(
			myAccount({
				kind: "member",
				policy: { id: "p-1", name: "default" },
				tokenOnly: true,
			}),
		);
		expect(row.keys).toEqual([]);
		expect(row.policy?.name).toBe("default");
		expect(row.tokenOnly).toBe(true);
		expect(row.kind).toBe("member");
	});

	test("keeps the user's keys in order", () => {
		const keys = [
			{ id: "k-1", name: "laptop", prefix: "rk_ab" },
			{ id: "k-2", name: "ci", prefix: "rk_cd" },
		];
		expect(toMyAccountRow(myAccount({ keys })).keys).toEqual(keys);
	});
});

describe("filterMyAccountRows", () => {
	const rows: MyAccountRow[] = [
		toMyAccountRow(myAccount()),
		toMyAccountRow(
			myAccount({
				account: { id: "acc-2", name: "m-1", displayName: "", closed: false },
				kind: "member",
				scope: { kind: "team", id: "t-1", name: "research" },
				policy: { id: "p-1", name: "gpt-only" },
				keys: [{ id: "k-1", name: "notebook", prefix: "rk_ab" }],
			}),
		),
	];
	const names = (out: MyAccountRow[]) => out.map((r) => r.name);

	test("keeps every row with no query and any kind", () => {
		expect(names(filterMyAccountRows(rows, " ", "all"))).toEqual(["me", "m-1"]);
	});

	test("narrows by kind", () => {
		expect(names(filterMyAccountRows(rows, "", "member"))).toEqual(["m-1"]);
		expect(filterMyAccountRows(rows, "", "provider")).toEqual([]);
	});

	test("matches scope, policy and key names case-insensitively", () => {
		expect(names(filterMyAccountRows(rows, "RESEARCH", "all"))).toEqual([
			"m-1",
		]);
		expect(names(filterMyAccountRows(rows, "gpt", "all"))).toEqual(["m-1"]);
		expect(names(filterMyAccountRows(rows, "notebook", "all"))).toEqual([
			"m-1",
		]);
		expect(names(filterMyAccountRows(rows, "alice", "all"))).toEqual(["me"]);
	});
});
