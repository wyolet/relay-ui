import { useRef } from "react";
import { from, randomSuffix, slugEndingIn } from "@/lib/slug";

/**
 * The slug a form saves under: an existing row keeps `existingName`; a new
 * one is its display name's slug plus a suffix fixed for the form's life, or
 * `fallback` when the name has no slug characters. Empty until a name is typed.
 */
export function useSlugFor(
	existingName: string | undefined,
	fallback: string,
): (displayName: string) => string {
	const suffix = useRef(randomSuffix());
	return (displayName) => {
		if (existingName) return existingName;
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return slugEndingIn(from(trimmed) ? trimmed : fallback, suffix.current);
	};
}
