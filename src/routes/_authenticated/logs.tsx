import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { type LogsFilter, logsInfiniteQueryOptions } from "@/api/hooks/logs";
import { LogDetailPanel } from "@/logs/LogDetailPanel";
import { LogsFilters } from "@/logs/LogsFilters";
import { LogsTable } from "@/logs/LogsTable";
import { SINCE_VALUES, STATUS_CLASS_VALUES } from "@/logs/logFilterConfig";
import { SLOW_MS } from "@/logs/predicates";
import { useLogsFilterOptions } from "@/logs/useLogsFilterOptions";
import { PageLoader } from "@/shared/Spinner";

const SLOW_LABEL = `Slow >${SLOW_MS / 1000}s`;

const searchSchema = z.object({
	q: z.string().default(""),
	since: z.enum(SINCE_VALUES).default("1h"),
	status_class: z.enum(STATUS_CLASS_VALUES).default(""),
	errors: z.boolean().default(false),
	slow: z.boolean().default(false),
	model_id: z.array(z.string()).default([]),
	host_id: z.array(z.string()).default([]),
	policy_id: z.array(z.string()).default([]),
	request: z.string().optional(),
});

type LogsSearch = z.infer<typeof searchSchema>;

/** Map URL search into the server-side /logs query. `q` is intentionally not
 * here — the backend has no free-text field, so it stays a client refinement. */
function toLogsFilter(s: LogsSearch): LogsFilter {
	const filter: LogsFilter = { since: s.since };
	if (s.status_class) filter.status_class = s.status_class;
	if (s.errors) filter.error = "true";
	if (s.slow) filter.duration_ms_min = SLOW_MS;
	if (s.model_id.length) filter.model_id = s.model_id;
	if (s.host_id.length) filter.host_id = s.host_id;
	if (s.policy_id.length) filter.policy_id = s.policy_id;
	return filter;
}

export const Route = createFileRoute("/_authenticated/logs")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		void context.queryClient.ensureInfiniteQueryData(
			logsInfiniteQueryOptions(toLogsFilter(deps)),
		),
	component: LogsPage,
});

function LogsPage() {
	const search = Route.useSearch();
	const { request } = search;
	const navigate = useNavigate();
	const options = useLogsFilterOptions();

	const patch = (next: Partial<LogsSearch>) =>
		void navigate({ to: "/logs", search: (prev) => ({ ...prev, ...next }) });

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-semibold text-foreground">Logs</h1>
				<p className="text-xs text-muted-foreground">
					Requests through the relay, newest first. Click one to inspect
					captured bodies.
				</p>
			</div>

			<LogsFilters
				values={search}
				options={options}
				slowLabel={SLOW_LABEL}
				onChange={patch}
			/>

			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
				<Suspense fallback={<Loading />}>
					<LogsTable
						selected={request ?? null}
						onSelect={(id) => patch({ request: id })}
						query={search.q}
						filter={toLogsFilter(search)}
					/>
				</Suspense>
				<div className="lg:sticky lg:top-4">
					<LogDetailPanel requestId={request ?? null} />
				</div>
			</div>
		</div>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card">
			<PageLoader />
		</div>
	);
}
