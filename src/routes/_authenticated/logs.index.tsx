import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { type LogsFilter, logsInfiniteQueryOptions } from "@/api/hooks/logs";
import { EraseBodiesButton } from "@/logs/EraseBodiesButton";
import { LogsFilters } from "@/logs/LogsFilters";
import { LogsHistogram } from "@/logs/LogsHistogram";
import { type LogFilterKey, LogsTable } from "@/logs/LogsTable";
import { SINCE_VALUES, STATUS_CLASS_VALUES } from "@/logs/logFilterConfig";
import { SLOW_MS } from "@/logs/predicates";
import { useLogLabeler } from "@/logs/useLogsFilterOptions";
import { PageLoader } from "@/shared/Spinner";
import { StaleContent } from "@/shared/StaleContent";
import { useDeferredSearch } from "@/shared/useDeferredSearch";
import { FILTER_DIMENSIONS } from "@/usage/filters/dimensions";

const SLOW_LABEL = `Slow >${SLOW_MS / 1000}s`;

const searchSchema = z.object({
	q: z.string().default(""),
	since: z.enum(SINCE_VALUES).default("1h"),
	status_class: z.enum(STATUS_CLASS_VALUES).default(""),
	/** Exact HTTP status codes (e.g. [429]) — deep-link only for now; the
	 * filter bar exposes status_class bands instead. */
	status: z.array(z.number()).default([]),
	errors: z.boolean().default(false),
	slow: z.boolean().default(false),
	model_id: z.array(z.string()).default([]),
	host_id: z.array(z.string()).default([]),
	team_id: z.array(z.string()).default([]),
	project_id: z.array(z.string()).default([]),
	principal_id: z.array(z.string()).default([]),
	relay_key_hash: z.array(z.string()).default([]),
	policy_id: z.array(z.string()).default([]),
	host_key_id: z.array(z.string()).default([]),
	expand: z.string().optional(),
});

type LogsSearch = z.infer<typeof searchSchema>;

/** The unfiltered feed; values equal to these stay out of the URL. */
const LOGS_DEFAULTS = searchSchema.parse({});

/** Map URL search into the server-side /logs query. `q` is intentionally not
 * here — the backend has no free-text field, so it stays a client refinement. */
function toLogsFilter(s: LogsSearch): LogsFilter {
	const filter: LogsFilter = { since: s.since };
	if (s.status_class) filter.status_class = s.status_class;
	if (s.status.length) filter.status = s.status;
	if (s.errors) filter.error = "true";
	if (s.slow) filter.duration_ms_min = SLOW_MS;
	for (const d of FILTER_DIMENSIONS) {
		if (s[d].length) filter[d] = s[d];
	}
	return filter;
}

export const Route = createFileRoute("/_authenticated/logs/")({
	validateSearch: searchSchema,
	search: { middlewares: [stripSearchParams(LOGS_DEFAULTS)] },
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		void context.queryClient.ensureInfiniteQueryData(
			logsInfiniteQueryOptions(toLogsFilter(deps)),
		),
	component: LogsPage,
});

function LogsPage() {
	const live = Route.useSearch();
	const { search, isStale } = useDeferredSearch(live);
	const { expand } = live;
	const navigate = useNavigate({ from: "/logs/" });
	const labelFor = useLogLabeler();
	const filter = toLogsFilter(search);

	const patch = (next: Partial<LogsSearch>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }) });

	// Click-to-filter from a table cell: append to a dimension or set status.
	const addFilter = (key: LogFilterKey, value: string) => {
		if (key === "status_class") {
			if (value === "2xx" || value === "4xx" || value === "5xx")
				patch({ status_class: value });
			return;
		}
		const cur = live[key];
		if (!cur.includes(value)) patch({ [key]: [...cur, value] });
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Logs</h1>
					<p className="mt-1 text-label text-ink-2">
						Requests through the relay, newest first. Expand a row for its
						summary; open the request page for captured bodies.
					</p>
				</div>
				<EraseBodiesButton />
			</div>

			<LogsHistogram filter={toLogsFilter(live)} />

			<LogsFilters values={live} slowLabel={SLOW_LABEL} onChange={patch} />

			<StaleContent stale={isStale}>
				<Suspense fallback={<Loading />}>
					<LogsTable
						expandedId={expand ?? null}
						onToggle={(id) => patch({ expand: expand === id ? undefined : id })}
						onOpenRequest={(id) =>
							void navigate({
								to: "/logs/$requestId",
								params: { requestId: id },
							})
						}
						onFilter={addFilter}
						labelFor={labelFor}
						query={search.q}
						filter={filter}
					/>
				</Suspense>
			</StaleContent>
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
