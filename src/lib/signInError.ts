export const ACCOUNT_DISABLED = "account_disabled";

const IDP_FAILED = "The identity provider sign-in failed. Try again.";
const INTERRUPTED = "The sign-in took too long or was interrupted. Try again.";
const AMBIGUOUS =
	"This sign-in can't be matched to a single account. Contact your administrator.";

const NOTICES = new Map<string, string>([
	[ACCOUNT_DISABLED, "Your account is disabled. Contact your administrator."],
	[
		"registration_closed",
		"There's no account for this sign-in and registration is closed. Ask an administrator for access.",
	],
	[
		"email_in_use",
		"An account with this email already exists. Ask an administrator to link your sign-in.",
	],
	["account_ambiguous", AMBIGUOUS],
	["identity_conflict", AMBIGUOUS],
	["idp_error", IDP_FAILED],
	["exchange_failed", IDP_FAILED],
	["invalid_identity", IDP_FAILED],
	["idp_unavailable", IDP_FAILED],
	["flow_expired", INTERRUPTED],
	["state_mismatch", INTERRUPTED],
	["missing_code", INTERRUPTED],
]);

/** The sign-in page's notice for a relay sign-in error code. */
export function signInErrorNotice(code: string): string {
	return NOTICES.get(code) ?? "Sign-in failed.";
}
