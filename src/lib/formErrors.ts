import type { z } from "zod";

/** First string message among a TanStack Form field's errors. */
export function firstError(
	errors: readonly unknown[] | undefined,
): string | undefined {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
}

/**
 * A field's first error once it was touched or a submit was tried. The
 * form-level validator fills every field's errors on the first change, so
 * untouched fields would otherwise turn red while the user types elsewhere.
 */
export function shownError(
	meta: { errors?: readonly unknown[]; isTouched?: boolean } | undefined,
	submissionAttempts: number,
): string | undefined {
	if (!meta?.isTouched && submissionAttempts === 0) return undefined;
	return firstError(meta?.errors);
}

/** Form-level validator that maps each field path to its first zod issue. */
export function zodFieldValidator<V>(schema: z.ZodType) {
	return ({ value }: { value: V }) => {
		const r = schema.safeParse(value);
		if (r.success) return undefined;
		const fields: Record<string, string> = {};
		for (const issue of r.error.issues) {
			const key = issue.path.join(".");
			if (key && !fields[key]) fields[key] = issue.message;
		}
		return { fields };
	};
}
