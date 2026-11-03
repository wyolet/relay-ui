import { notAvailableLabel, type UnavailablePicks } from "@/lib/workContext";
import type { LinkChoice } from "@/policies/usePolicyLinkChoices";
import type { CheckOption } from "@/shared/MultiSelect";

/**
 * Every usable pool, then linked ones outside that list so they stay
 * visible and can be unticked. A linked row carries its failover rank (its
 * place in `linked`) and its warnings.
 */
export function poolCheckOptions({
	usable,
	linked,
	warnings,
	unavailable,
}: {
	usable: readonly LinkChoice[];
	/** In failover order. */
	linked: readonly LinkChoice[];
	warnings: ReadonlyMap<string, readonly string[]>;
	unavailable: UnavailablePicks | undefined;
}): CheckOption[] {
	const usableIds = new Set(usable.map((c) => c.id));
	const rows = [...usable, ...linked.filter((c) => !usableIds.has(c.id))];
	const ranks = new Map(linked.map((c, i) => [c.id, i + 1]));
	return rows.map((c) => {
		const notes = [
			...(unavailable?.ids.includes(c.id)
				? [notAvailableLabel(unavailable.scope)]
				: []),
			...(warnings.get(c.id) ?? []),
		];
		const rank = ranks.get(c.id);
		return {
			value: c.id,
			label: c.label,
			hint: c.meta,
			...(rank !== undefined ? { rank } : {}),
			...(notes.length > 0 ? { notes } : {}),
		};
	});
}
