import { CONTROL_API_URL } from "@/api/client";

/**
 * Sends the browser to relay's OIDC start, asking it to come back to this
 * sign-in page (relay appends `?error=<code>` on failure). A navigation can't
 * see relay refuse `return_to`, so a manual-redirect fetch checks it first.
 */
export async function startOidcSignIn(): Promise<void> {
	const start = `${CONTROL_API_URL}/auth/oidc/start`;
	const returnTo = new URL(window.location.pathname, window.location.origin);
	const withReturn = `${start}?${new URLSearchParams({ return_to: returnTo.href })}`;
	try {
		const res = await fetch(withReturn, {
			credentials: "include",
			redirect: "manual",
		});
		if (res.status === 400) {
			console.error(
				`oidc start refused return_to ${returnTo.href}: ${await res.text()}`,
			);
			window.location.assign(start);
			return;
		}
	} catch {
		// Unreachable relay: the navigation below shows the browser's own error.
	}
	window.location.assign(withReturn);
}
