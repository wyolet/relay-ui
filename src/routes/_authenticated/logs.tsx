import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Timer } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { logsInfiniteQueryOptions } from "@/api/hooks/logs";
import { Toggle } from "@/components/ui/toggle";
import { LogDetailPanel } from "@/logs/LogDetailPanel";
import { LogsTable } from "@/logs/LogsTable";
import { SLOW_MS } from "@/logs/predicates";

const searchSchema = z.object({
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
	const { errors, slow, request } = Route.useSearch();
	const navigate = useNavigate();

	const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
		void navigate({
			to: "/logs",
			search: { errors, slow, request, ...patch },
		});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Logs</h1>
					<p className="text-xs text-muted-foreground">
						Requests through the relay, newest first. Click one to inspect
						captured bodies.
					</p>
				</div>
				<div className="flex items-center gap-1.5">
					<Toggle
						variant="outline"
						pressed={errors}
						onPressedChange={(v) => setSearch({ errors: v })}
					>
						<AlertTriangle aria-hidden />
						Errors
					</Toggle>
					<Toggle
						variant="outline"
						pressed={slow}
						onPressedChange={(v) => setSearch({ slow: v })}
					>
						<Timer aria-hidden />
						Slow &gt;{SLOW_MS / 1000}s
					</Toggle>
				</div>
			</div>

			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
				<Suspense fallback={<Loading />}>
					<LogsTable
						selected={request ?? null}
						onSelect={(id) => setSearch({ request: id })}
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
