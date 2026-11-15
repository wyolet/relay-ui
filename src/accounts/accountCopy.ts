export const PROVIDER_ACCOUNT_SUMMARY =
	"A provider organization at a host, with the keys that authenticate to it.";

/** What each side of the Accounts tab's quick filter narrows to. */
export const ACCOUNT_SIDE_HINTS = {
	provider: "Organizations at a provider, with the keys relay calls them with.",
	relay:
		"One per team, project, user, membership and service account; they hold policies and get charged.",
} as const;

export const PAYLOAD_LOGGING_RULE =
	"The nearest account on the ladder with a value wins, then the key's own flag.";
