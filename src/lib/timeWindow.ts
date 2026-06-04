/** Rate-limit windows are whole seconds, both on the wire and in the UI. */
export interface WindowPreset {
	/** Window length in seconds. */
	value: number;
	/** Long form: "Per minute". */
	label: string;
	/** Short form: "RPM". */
	short: string;
}

export const WINDOW_PRESETS: readonly WindowPreset[] = [
	{ value: 1, label: "Per second", short: "RPS" },
	{ value: 60, label: "Per minute", short: "RPM" },
	{ value: 3600, label: "Per hour", short: "RPH" },
	{ value: 86_400, label: "Per day", short: "RPD" },
] as const;

export function findWindowPreset(seconds: number): WindowPreset | undefined {
	return WINDOW_PRESETS.find((p) => p.value === seconds);
}

/** "Per minute" if it matches a preset, otherwise "Every Ns". */
export function windowLabel(seconds: number): string {
	return findWindowPreset(seconds)?.label ?? `Every ${seconds}s`;
}

/** Compact window: "1s" / "5m" / "1h" / "2d". */
export function windowShort(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
	return `${Math.round(seconds / 86_400)}d`;
}

/**
 * Parse a Go duration string ("1m0s", "24h0m0s", "1s") to whole seconds.
 * The server resolves some rate-limit windows as Go durations (the `Limit`
 * shape); this turns them back into seconds for {@link windowShort}/{@link windowLabel}.
 */
export function parseDurationSeconds(d: string): number {
	let total = 0;
	for (const m of d.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
		const n = Number.parseFloat(m[1]);
		switch (m[2]) {
			case "h":
				total += n * 3600;
				break;
			case "m":
				total += n * 60;
				break;
			case "s":
				total += n;
				break;
			case "ms":
				total += n / 1000;
				break;
		}
	}
	return Math.round(total);
}
