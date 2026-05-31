import { type LogsFilter, useLogsHistogram } from "@/api/hooks/logs";
import { cn } from "@/lib/utils";

const WINDOW_LABEL: Record<string, string> = {
	"1h": "last 1h",
	"6h": "last 6h",
	"24h": "last 24h",
	"7d": "last 7d",
	"30d": "last 30d",
};

/**
 * Request-volume histogram over the window (errors stacked), scoped by the
 * feed's dimension filters. Non-blocking — renders a quiet placeholder while
 * loading or when the window is empty.
 */
export function LogsHistogram({ filter }: { filter: LogsFilter }) {
	const { points, isLoading } = useLogsHistogram(filter);
	const max = points.reduce((m, p) => Math.max(m, p.requests), 0);
	const windowLabel = WINDOW_LABEL[filter.since ?? "1h"] ?? "window";

	return (
		<div className="rounded-lg border border-border bg-card p-3">
			<div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
				<span>Requests over time · {windowLabel}</span>
				<span className="inline-flex items-center gap-3">
					<span className="inline-flex items-center gap-1">
						<span className="size-2 rounded-sm bg-primary/70" /> ok
					</span>
					<span className="inline-flex items-center gap-1">
						<span className="size-2 rounded-sm bg-destructive" /> error
					</span>
				</span>
			</div>

			{isLoading || max === 0 ? (
				<div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
					{isLoading ? "Loading…" : "No traffic in this window."}
				</div>
			) : (
				<div className="flex h-20 items-end gap-0.5">
					{points.map((p) => (
						<div
							key={p.bucket}
							className="flex h-full flex-1 flex-col justify-end"
							title={`${p.requests} req${p.errors ? ` · ${p.errors} err` : ""}`}
						>
							{p.errors > 0 && (
								<div
									className="rounded-t-sm bg-destructive"
									style={{ height: `${(p.errors / max) * 100}%` }}
								/>
							)}
							<div
								className={cn(
									"bg-primary/60",
									p.errors > 0 ? "" : "rounded-t-sm",
								)}
								style={{
									height: `${((p.requests - p.errors) / max) * 100}%`,
								}}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
