import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { resolveWindow, useUsageOverview } from "@/api/hooks/usage";
import { fmtCompact, fmtPct } from "@/usage/format";
import { useGroupLabeler } from "@/usage/useGroupLabeler";

const DIMENSION = "model_id" as const;
const LIMIT = 5;

/**
 * Models with the highest error rate (any failing traffic), ranked worst-first.
 * The operator's "where is it breaking" glance — distinct from the volume
 * leaderboards, which rank by request count.
 */
export function ErrorHotspots() {
	// Week-scoped like the rest of the dashboard's traffic band.
	const { groups } = useUsageOverview(DIMENSION, resolveWindow("week"));
	const labelFor = useGroupLabeler(DIMENSION);

	const hotspots = groups
		.filter((g) => g.errorCount > 0)
		.sort((a, b) => b.errorRate - a.errorRate)
		.slice(0, LIMIT);

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">Error hotspots</h2>
				<span className="text-[11px] text-muted-foreground">
					by model · this week
				</span>
			</div>

			{hotspots.length === 0 ? (
				<div className="flex items-center gap-2 px-4 py-4 text-xs text-muted-foreground">
					<ShieldCheck
						className="size-4 text-success"
						aria-hidden="true"
					/>
					No errors in the current window.
				</div>
			) : (
				<ul className="divide-y divide-border">
					{hotspots.map((g) => (
						<li
							key={g.key}
							className="flex items-center justify-between gap-3 px-4 py-2.5"
						>
							<code
								className="min-w-0 truncate font-mono text-xs text-foreground"
								title={g.key}
							>
								{labelFor(g.key)}
							</code>
							<div className="flex shrink-0 items-center gap-3 text-right tabular-nums">
								<span className="text-sm font-medium text-warning">
									{fmtPct(g.errorRate)}
								</span>
								<span className="w-14 text-[11px] text-muted-foreground">
									{fmtCompact(g.errorCount)} err
								</span>
							</div>
						</li>
					))}
				</ul>
			)}

			<Link
				to="/logs"
				search={{ errors: true }}
				className="flex items-center justify-center border-t border-border px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground"
			>
				Inspect failed requests →
			</Link>
		</div>
	);
}
