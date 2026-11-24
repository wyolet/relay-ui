/** Mutation meta for a dry run: it writes nothing, so nothing is refreshed after it. */
export const DRY_RUN_META = { writesNothing: true } as const;

export function writesNothing(
	meta: Record<string, unknown> | undefined,
): boolean {
	return meta?.writesNothing === true;
}
