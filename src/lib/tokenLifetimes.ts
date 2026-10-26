import { type DurationDraft, nanosFromDraft } from "@/lib/durationNanos";

/** Mirrors the relay's auth:tokens validation, so a bad pair is flagged on
 * the field instead of coming back as a 422. */
export function tokenLifetimeErrors(
	defaultTTL: DurationDraft,
	maxTTL: DurationDraft,
): { defaultTTL?: string; maxTTL?: string } {
	const errors: { defaultTTL?: string; maxTTL?: string } = {};
	const def = nanosFromDraft(defaultTTL);
	const max = nanosFromDraft(maxTTL);
	if (!(def > 0)) errors.defaultTTL = "Must be longer than zero.";
	if (!(max > 0)) errors.maxTTL = "Must be longer than zero.";
	if (!errors.defaultTTL && !errors.maxTTL && def > max) {
		errors.defaultTTL = "Can't be longer than the maximum lifetime.";
	}
	return errors;
}
