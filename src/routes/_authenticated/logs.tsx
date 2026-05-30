import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { logsInfiniteQueryOptions } from "@/api/hooks/logs";
import { FilterBar } from "@/filters/FilterBar";
import type { FilterDef } from "@/filters/types";
import { LogDetailPanel } from "@/logs/LogDetailPanel";
import { LogsTable } from "@/logs/LogsTable";
import { SLOW_MS } from "@/logs/predicates";

const LOG_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "model, source, request id",
		default: "",
	},
	{ key: "errors", type: "toggle", label: "Errors" },
	{ key: "slow", type: "toggle", label: `Slow >${SLOW_MS / 1000}s` },
] as const satisfies readonly FilterDef[];

const searchSchema = z.object({
	q: z.string().default(""),
	errors: z.boolean().default(false),
	slow: z.boolean().default(false),
	request: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/logs")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		void context.queryClient.ensureInfiniteQueryData(
			logsInfiniteQueryOptions(),
		),
	component: LogsPage,
});

function LogsPage() {
	const { q, errors, slow, request } = Route.useSearch();
	const navigate = useNavigate();

	const patch = (next: Record<string, string | boolean | undefined>) =>
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

			<FilterBar
				defs={LOG_FILTERS}
				state={{ q, errors, slow }}
				onChange={patch}
			/>

			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
				<Suspense fallback={<Loading />}>
					<LogsTable
						selected={request ?? null}
						onSelect={(id) => patch({ request: id })}
						query={q}
						errorsOnly={errors}
						slowOnly={slow}
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
		<div className="rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
			Loading…
		</div>
	);
}
