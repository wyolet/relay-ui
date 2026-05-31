import { Suspense, useState } from "react";
import type { LogsFilter } from "@/api/hooks/logs";
import { LogDetailPanel } from "./LogDetailPanel";
import { LogsTable } from "./LogsTable";

/** Which /logs filter to scope by. */
export type LogScope = "host_id" | "model_id" | "policy_id";

/**
 * Per-resource Logs tab: the request feed filtered to one host/model/policy,
 * with the inspector beside it. Selection is local (no route search here).
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
	const [selected, setSelected] = useState<string | null>(null);
	const filter: LogsFilter = {};
	filter[scope] = [id];

	return (
		<div className="flex flex-col gap-4 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
			<Suspense fallback={<Loading />}>
				<LogsTable
					selected={selected}
					onSelect={setSelected}
					query=""
					filter={filter}
					emptyBody={`No requests for this ${label} yet — they'll appear here newest-first once traffic flows.`}
				/>
			</Suspense>
			<div className="lg:sticky lg:top-4">
				<LogDetailPanel requestId={selected} />
			</div>
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
