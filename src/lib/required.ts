/** The value a later write needs from an earlier one; throws when it is missing. */
export function required<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(`The ${what} is missing.`);
	return value;
}
