import type { z } from "zod";

/** First string message among a TanStack Form field's errors. */
export function firstError(
	errors: readonly unknown[] | undefined,
): string | undefined {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
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
