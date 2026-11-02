import { CONTROL_API_URL } from "@/api/client";
import { feature } from "@/api/runtimeConfig";
import { oidcStartUrl } from "@/lib/oidcStart";

export function useSsoSignIn() {
	return {
		enabled: feature("oidc"),
		start: () =>
			window.location.assign(
				oidcStartUrl(CONTROL_API_URL, window.location.href),
			),
	};
}
