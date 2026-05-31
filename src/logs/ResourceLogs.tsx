import { useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import type { LogsFilter } from "@/api/hooks/logs";
import { LogsTable } from "./LogsTable";

/** Which /logs filter to scope by. */
export type LogScope = "host_id" | "model_id" | "policy_id";

/**
 * Per-resource Logs tab: the request feed filtered to one host/model/policy.
 * Rows expand in place for a summary; captured requests open the full page.
 */
export function ResourceLogs({
	scope,
	id,
	label,
}: {
	scope: LogScope;
	id: string;
	/** Human noun for the empty state, e.g. "host". */
	label: string;
}) {
	const [expanded, setExpanded] = useState<string | null>(null);
	const navigate = useNavigate();
	const filter: LogsFilter = {};
	filter[scope] = [id];

	return (
		<div className="pt-2">
			<Suspense fallback={<Loading />}>
				<LogsTable
					expandedId={expanded}
					onToggle={(rid) => setExpanded((p) => (p === rid ? null : rid))}
					onOpenRequest={(rid) =>
						void navigate({
							to: "/logs/$requestId",
							params: { requestId: rid },
						})
					}
					query=""
					filter={filter}
					emptyBody={`No requests for this ${label} yet — they'll appear here newest-first once traffic flows.`}
				/>
			</Suspense>
		</div>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
			Loading…
		</div>
	);
}
