/**
 * Relay's OIDC start URL, asking it to return to the sign-in page at `pageUrl`
 * (relay appends `?error=<code>` there on failure). Query and hash are dropped
 * so a stale `error` never rides back.
 */
export function oidcStartUrl(controlApiUrl: string, pageUrl: string): string {
	const page = new URL(pageUrl);
	const returnTo = new URL(page.pathname, page.origin).href;
	return `${controlApiUrl}/auth/oidc/start?${new URLSearchParams({ return_to: returnTo })}`;
}
