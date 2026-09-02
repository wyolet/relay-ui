import { describe, expect, test } from "bun:test";
import { isLicenseRequired } from "@/api/hooks/license";
import { ApiError } from "@/api/types/errors";

describe("isLicenseRequired", () => {
	test("matches the relay's sentinel in a rejected write", () => {
		const err = new ApiError(400, {
			message: 'auth:oidc: "sso" requires a license: license_required',
			type: "invalid_request_error",
		});
		expect(isLicenseRequired(err)).toBe(true);
	});

	test("ignores other API errors", () => {
		const err = new ApiError(400, {
			message: "auth:oidc: issuer is required when enabled",
			type: "invalid_request_error",
		});
		expect(isLicenseRequired(err)).toBe(false);
	});

	test("ignores non-API errors", () => {
		expect(isLicenseRequired(new Error("license_required"))).toBe(false);
	});
});
