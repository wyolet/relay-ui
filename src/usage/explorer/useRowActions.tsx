import { LogsLink } from "./LogsLink";
import { isFilterDimension } from "./search";
import { useExplorer } from "./useExplorer";

/** What a lens table row does: a click narrows the explorer to it, and the
 * trailing link opens its requests in Logs where Logs can filter. */
export function useRowActions() {
	const { search, toggle } = useExplorer();
	const groupBy = search.group_by;
	return {
		onDrill: isFilterDimension(groupBy)
			? (key: string) => toggle(groupBy, key)
			: undefined,
		rowAction: (key: string) => (
			<LogsLink
				groupBy={groupBy}
				value={key}
				range={search.range}
				statusClass={search.status_class}
			/>
		),
	};
}
