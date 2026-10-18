import type { UsageGroupStat } from "@/api/hooks/usage";
import { compareValue } from "@/lib/usage-math/delta";
import { fmtSignedPct } from "@/usage/format";

/** Usage rows for traffic with no value in the dimension (no team, …). */
export const UNSET_KEY = "—";

/** Change of `value` against last period's same group: "new" when the group
 * wasn't there, "—" when there's no relative baseline. */
export function changeText(
	value: (g: UsageGroupStat) => number,
	current: UsageGroupStat,
	previous: UsageGroupStat | undefined,
): string {
	if (!previous) return "new";
	const delta = compareValue(value(current), value(previous));
	return delta.ratio != null ? fmtSignedPct(delta.ratio) : "—";
}
