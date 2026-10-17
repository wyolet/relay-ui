import createClient from "openapi-fetch";
import { z } from "zod";
import { controlApiUrl, inferenceApiUrl } from "./runtimeConfig";
import { ACCOUNT_DISABLED } from "./types/errors";
import type { paths } from "./types.gen";

/**
 * API base URLs, resolved from the runtime config (see {@link controlApiUrl}).
 * Config is loaded once at boot *before* this module is imported (the app is
 * dynamically imported after `loadRuntimeConfig()` in `main.tsx`), so these
 * read the live values. They never change during a session.
 *
 * - **Control/admin plane** — `apiClient` points here.
 * - **Data plane / inference** — only used to build the copy-paste client
 *   snippets shown after setup (`${INFERENCE_API_URL}/{adapter}/v1`).
 *
 * In a split deployment these are cross-origin; the backend must then send
 * permissive CORS + `SameSite=None` cookies for the credentialed control calls.
 */
export const CONTROL_API_URL: string = controlApiUrl();
export const INFERENCE_API_URL: string = inferenceApiUrl();

export const apiClient = createClient<paths>({
	baseUrl: CONTROL_API_URL,
	credentials: "include",
});

const errorCodeSchema = z.object({ error: z.object({ code: z.string() }) });

let accountDisabledListener: () => void = () => {};

/** What to do when any control call answers that the account is disabled. */
export function onAccountDisabled(listener: () => void): void {
	accountDisabledListener = listener;
}

apiClient.use({
	async onResponse({ response }) {
		if (response.ok) return;
		const body: unknown = await response
			.clone()
			.json()
			.catch(() => undefined);
		const parsed = errorCodeSchema.safeParse(body);
		if (parsed.success && parsed.data.error.code === ACCOUNT_DISABLED) {
			accountDisabledListener();
		}
	},
});
