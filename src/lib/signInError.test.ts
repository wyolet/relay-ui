import { describe, expect, test } from "bun:test";
import { signInErrorNotice } from "./signInError";

describe("signInErrorNotice", () => {
	test("known codes map to their notice", () => {
		expect(signInErrorNotice("account_disabled")).toBe(
			"Your account is disabled. Contact your administrator.",
		);
		expect(signInErrorNotice("state_mismatch")).toBe(
			"The sign-in took too long or was interrupted. Try again.",
		);
		expect(signInErrorNotice("identity_conflict")).toBe(
			signInErrorNotice("account_ambiguous"),
		);
	});

	test("login_failed and unknown codes read as a plain failure", () => {
		expect(signInErrorNotice("login_failed")).toBe("Sign-in failed.");
		expect(signInErrorNotice("something_new")).toBe("Sign-in failed.");
		expect(signInErrorNotice("constructor")).toBe("Sign-in failed.");
	});
});
