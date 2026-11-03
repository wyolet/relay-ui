import { describe, expect, test } from "bun:test";
import { ApiError } from "@/api/types/errors";
import {
	accountOwnerError,
	fromPersonalAccountChoice,
	groupPersonalAccountLabel,
	groupTakesPersonalAccount,
	keyLaneError,
	personalAccountEffectiveText,
	personalAccountOffNote,
	toPersonalAccountChoice,
	userPersonalAccountInput,
} from "@/lib/personalAccount";

function apiError(status: number, code: string): ApiError {
	return new ApiError(status, { type: "x", code, message: code });
}

describe("choices", () => {
	test("unset and the empty input both inherit", () => {
		expect(toPersonalAccountChoice(undefined)).toBe("inherit");
		expect(toPersonalAccountChoice("")).toBe("inherit");
		expect(toPersonalAccountChoice("off")).toBe("off");
	});
	test("a group write omits Inherit", () => {
		expect(fromPersonalAccountChoice("inherit")).toEqual({});
		expect(fromPersonalAccountChoice("on")).toEqual({ personalAccount: "on" });
	});
	test("a user write clears Inherit with an empty string", () => {
		expect(userPersonalAccountInput("inherit")).toBe("");
		expect(userPersonalAccountInput("off")).toBe("off");
	});
});

test("only system-owned groups take the switch", () => {
	expect(groupTakesPersonalAccount({ kind: "system" })).toBe(true);
	expect(groupTakesPersonalAccount({ kind: "user", id: "u1" })).toBe(false);
	expect(groupTakesPersonalAccount(undefined)).toBe(false);
});

test("groupPersonalAccountLabel", () => {
	expect(groupPersonalAccountLabel(undefined)).toBe(
		"Inherit (deployment setting)",
	);
	expect(groupPersonalAccountLabel("on")).toBe("On");
	expect(groupPersonalAccountLabel("off")).toBe("Off");
});

test("personalAccountEffectiveText names the source", () => {
	expect(personalAccountEffectiveText({ state: "off", source: "user" })).toBe(
		"Off, set for this user",
	);
	expect(personalAccountEffectiveText({ state: "on", source: "setting" })).toBe(
		"On, from the deployment setting",
	);
	expect(
		personalAccountEffectiveText({
			state: "off",
			source: "group",
			groupId: "g1",
		}),
	).toBe("Off, from group");
});

describe("personalAccountOffNote", () => {
	test("silent while the account serves or the state is unknown", () => {
		expect(
			personalAccountOffNote({ state: "on", source: "setting" }, undefined),
		).toBeUndefined();
		expect(personalAccountOffNote(undefined, undefined)).toBeUndefined();
	});
	test("names what turned it off", () => {
		expect(
			personalAccountOffNote({ state: "off", source: "user" }, undefined),
		).toBe("Personal account is off (set for you)");
		expect(
			personalAccountOffNote({ state: "off", source: "setting" }, undefined),
		).toBe("Personal account is off (deployment setting)");
		expect(
			personalAccountOffNote(
				{ state: "off", source: "group", groupId: "g1" },
				"Contractors",
			),
		).toBe("Personal account is off (group Contractors)");
	});
	test("an unreadable group is left out", () => {
		expect(
			personalAccountOffNote(
				{ state: "off", source: "group", groupId: "g1" },
				undefined,
			),
		).toBe("Personal account is off");
	});
});

describe("error mapping", () => {
	test("a key without a lane, or in the personal one, fails on the account field", () => {
		expect(keyLaneError(apiError(400, "lane_required"))).toContain(
			"pick the account this key runs in",
		);
		expect(keyLaneError(apiError(403, "personal_account_off"))).toContain(
			"Personal accounts are off",
		);
		expect(keyLaneError(apiError(403, "account_not_held"))).toBeUndefined();
		expect(keyLaneError(apiError(400, "personal_account_off"))).toBeUndefined();
	});
	test("a provider account create fails on the owner", () => {
		expect(accountOwnerError(apiError(403, "personal_account_off"))).toContain(
			"team or project",
		);
		expect(accountOwnerError(new Error("x"))).toBeUndefined();
	});
});
