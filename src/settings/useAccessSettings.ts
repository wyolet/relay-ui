import { useQuery } from "@tanstack/react-query";
import {
	accountsSettingsQueryOptions,
	authOIDCQueryOptions,
	authSCIMQueryOptions,
	authTokensQueryOptions,
	useUpdateAccountsSettings,
} from "@/api/hooks/settings";
import { durationText } from "@/lib/durationNanos";
import { useSettingSave } from "@/settings/useSettingSave";

/** Personal accounts, SSO, SCIM and inference tokens as their rows read them.
 * Not suspending: a section the caller can't read shows a dash, not an error. */
export function useAccessSettings() {
	const accounts = useQuery({ ...accountsSettingsQueryOptions, retry: false });
	const oidc = useQuery({ ...authOIDCQueryOptions, retry: false });
	const scim = useQuery({ ...authSCIMQueryOptions, retry: false });
	const tokens = useQuery({ ...authTokensQueryOptions, retry: false });
	const personal = useSettingSave(
		useUpdateAccountsSettings(),
		"Failed to update personal accounts.",
	);

	const accountsValue = accounts.data?.value;
	const oidcValue = oidc.data?.value;
	const tokensValue = tokens.data?.value;
	return {
		personalOn: accountsValue
			? accountsValue.personalAccounts === "on"
			: undefined,
		setPersonalOn: (on: boolean) =>
			accountsValue &&
			personal.save(
				{ ...accountsValue, personalAccounts: on ? "on" : "off" },
				`Personal accounts ${on ? "on" : "off"}`,
				"personal-accounts",
			),
		personalPending: personal.pending,
		sso: oidcValue
			? oidcValue.enabled
				? (hostOf(oidcValue.issuer) ?? "On")
				: "Off"
			: undefined,
		scim: scim.data ? (scim.data.value.enabled ? "On" : "Off") : undefined,
		tokens: tokensValue
			? tokensValue.enabled
				? `On, ${durationText(tokensValue.defaultTTL ?? 0)} by default`
				: "Off"
			: undefined,
	};
}

function hostOf(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}
