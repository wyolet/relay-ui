import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { logsInfiniteQueryOptions } from "@/api/hooks/logs";
import { Switch } from "@/components/ui/switch";
import { LogsTable } from "@/logs/LogsTable";

const searchSchema = z.object({
	errors: z.boolean().default(false),
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
	const { errors } = Route.useSearch();
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Logs</h1>
					<p className="text-xs text-muted-foreground">
						Captured request &amp; response bodies for opted-in policies and
						relay keys.
					</p>
				</div>
				<label
					htmlFor="logs-errors-only"
					className="inline-flex items-center gap-2 text-xs text-muted-foreground"
				>
					Errors only
					<Switch
						id="logs-errors-only"
						checked={errors}
						onCheckedChange={(v) =>
							void navigate({ to: "/logs", search: { errors: v } })
						}
					/>
				</label>
			</div>

			<Suspense fallback={<Loading />}>
				<LogsTable errorsOnly={errors} />
			</Suspense>
		</div>
	);
}

function Loading() {
	return (
		<div className="py-8 text-center text-sm text-muted-foreground">
			Loading…
		</div>
	);
}
