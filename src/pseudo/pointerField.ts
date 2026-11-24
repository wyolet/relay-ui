import type { components } from "@/api/types.gen";

type PseudoIssue = components["schemas"]["PseudoIssue"];

/** A form's JSON Pointer prefixes into its request body, each to the field holding that part. */
export type PointerFields<F extends string> = Readonly<Record<string, F>>;

/**
 * The field a JSON Pointer into the request body names: the longest prefix
 * it equals or sits under, so `/spec/ids/1` falls to `/spec/ids`. None for
 * "" or a part the form doesn't hold.
 */
export function pointerField<F extends string>(
	pointer: string,
	fields: PointerFields<F>,
): F | undefined {
	let best: string | undefined;
	for (const prefix of Object.keys(fields)) {
		const under = pointer === prefix || pointer.startsWith(`${prefix}/`);
		if (under && (best === undefined || prefix.length > best.length)) {
			best = prefix;
		}
	}
	return best === undefined ? undefined : fields[best];
}

export interface FieldIssue<F extends string> {
	/** Unset for a row that exists already: it has no part in the body. */
	field?: F;
	message: string;
}

/** Issues by the field their pointer names; a row the caller can't see comes without a message and reads as `hiddenMessage`. */
export function issuesByField<F extends string>(
	issues: readonly PseudoIssue[],
	fields: PointerFields<F>,
	hiddenMessage: string,
): FieldIssue<F>[] {
	return issues.map((issue) => {
		const field = pointerField(issue.pointer ?? "", fields);
		const message = issue.message || hiddenMessage;
		return field ? { field, message } : { message };
	});
}
