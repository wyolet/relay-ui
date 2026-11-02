import type { HostKeyHealth } from "@/api/hooks/hostkeys";

export type KeyHealthTone = "ok" | "warn" | "alert" | "muted";

export interface KeyHealthView {
	label: string;
	tone: KeyHealthTone;
	/** The breaker's reason, when it is open. */
	detail: string | undefined;
}

/** The breaker state as one word; an open breaker with no expiry waits for a rotation. */
export function keyHealthView(
	health: HostKeyHealth | undefined,
	failed = false,
): KeyHealthView {
	if (!health)
		return failed
			? { label: "Unknown", tone: "muted", detail: undefined }
			: { label: "Checking", tone: "muted", detail: undefined };
	const detail = health.reason?.trim() || undefined;
	switch (health.state) {
		case "closed":
			return { label: "Healthy", tone: "ok", detail: undefined };
		case "half_open":
			return { label: "Recovering", tone: "warn", detail };
		case "open":
			return health.indefinite
				? { label: "Failing", tone: "alert", detail }
				: { label: "Cooling down", tone: "warn", detail };
		default:
			return { label: "Unknown", tone: "muted", detail: undefined };
	}
}
