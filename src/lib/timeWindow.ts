/** Rate-limit windows are stored as nanoseconds on the wire; the UI works in seconds. */
export const NS_PER_SEC = 1_000_000_000;

export const nsToSec = (ns: number): number => Math.round(ns / NS_PER_SEC);
export const secToNs = (s: number): number => Math.round(s * NS_PER_SEC);

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
