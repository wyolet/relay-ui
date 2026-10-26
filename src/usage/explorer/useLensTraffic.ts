import { useHasTraffic } from "@/api/hooks/usage";
import { RANGE_PERIOD_LABELS } from "@/usage/format";
import { useExplorer } from "./useExplorer";

/** Whether the explorer's slice saw any request, and whether filters are
 * what emptied it. */
export function useLensTraffic() {
	const { search, win, filter } = useExplorer();
	return {
		hasTraffic: useHasTraffic(win, filter),
		filtered: Object.keys(filter).length > 0,
		period: RANGE_PERIOD_LABELS[search.range],
	};
}
