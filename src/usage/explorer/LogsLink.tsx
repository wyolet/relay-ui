import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import type { UsageGroupBy, UsageRange } from "@/api/hooks/usage";
import type { StatusClass } from "@/logs/logFilterConfig";
import {
	type FilterDimension,
	isFilterDimension,
} from "@/usage/filters/dimensions";

/** The logs window that covers a usage range. */
const SINCE: Record<UsageRange, "24h" | "7d" | "30d"> = {
	today: "24h",
	week: "7d",
	month: "30d",
	custom: "30d",
};

/** Opens the requests behind one table row; nothing for dimensions Logs
 * can't filter on (source, error kind, …). */
export function LogsLink({
	groupBy,
	value,
	range,
	statusClass,
}: {
	groupBy: UsageGroupBy;
	value: string;
	range: UsageRange;
	statusClass: StatusClass;
}) {
	if (!isFilterDimension(groupBy)) return null;
	const scope: Partial<Record<FilterDimension, string[]>> = {};
	scope[groupBy] = [value];
	return (
		<Link
			to="/logs"
			search={{ ...scope, since: SINCE[range], status_class: statusClass }}
			aria-label="Open in Logs"
			title="Open in Logs"
			className="inline-flex text-ink-3 hover:text-foreground"
		>
			<ScrollText className="size-3.5" aria-hidden />
		</Link>
	);
}
