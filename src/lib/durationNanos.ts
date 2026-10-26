/** Go time.Duration values cross the wire as integer nanoseconds. */
const NANOS_PER_MINUTE = 60_000_000_000;

export const DURATION_UNITS = [
	{ value: "m", label: "minutes", nanos: NANOS_PER_MINUTE },
	{ value: "h", label: "hours", nanos: 60 * NANOS_PER_MINUTE },
	{ value: "d", label: "days", nanos: 24 * 60 * NANOS_PER_MINUTE },
] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number]["value"];

/** A duration as the user edits it: an amount in a chosen unit. */
export interface DurationDraft {
	amount: number;
	unit: DurationUnit;
}

export function isDurationUnit(v: string | null): v is DurationUnit {
	return DURATION_UNITS.some((u) => u.value === v);
}

/** Largest unit that holds the duration whole; minutes (possibly fractional)
 * otherwise. */
export function draftFromNanos(nanos: number): DurationDraft {
	for (const u of [...DURATION_UNITS].reverse()) {
		if (nanos > 0 && nanos % u.nanos === 0) {
			return { amount: nanos / u.nanos, unit: u.value };
		}
	}
	return { amount: nanos / NANOS_PER_MINUTE, unit: "m" };
}

export function nanosFromDraft({ amount, unit }: DurationDraft): number {
	const u = DURATION_UNITS.find((d) => d.value === unit) ?? DURATION_UNITS[0];
	return Math.round(amount * u.nanos);
}
