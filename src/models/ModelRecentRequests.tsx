import { Link } from "@tanstack/react-router";
import { useModelRecentRequests } from "@/models/useModelRecentRequests";
import { Section } from "@/shared/Section";

const GRID =
	"grid grid-cols-[5.5rem_3rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem_5rem] items-baseline gap-x-4";

/** The model's newest requests, each opening in Logs; nothing without any
 * in the last 7 days (the figures already say so). */
export function ModelRecentRequests({
	modelName,
	modelId,
}: {
	modelName: string;
	modelId: string;
}) {
	const rows = useModelRecentRequests(modelName, modelId);
	if (rows.length === 0) return null;
	const logs = { model_id: [modelId], since: "7d" as const };
	return (
		<Section
			title="Recent requests"
			aside={
				<Link
					to="/logs"
					search={logs}
					className="text-meta text-ink-3 hover:text-foreground"
				>
					Open in Logs →
				</Link>
			}
		>
			<div className="overflow-x-auto">
				<div className="grid min-w-[40rem] grid-cols-1 text-meta tabular-nums">
					<div className={`${GRID} border-b border-rule pb-2 text-ink-3`}>
						<span>Time</span>
						<span>Status</span>
						<span>Host</span>
						<span>Key</span>
						<span>Finish</span>
						<span className="text-right">Latency</span>
						<span className="text-right">Tokens</span>
					</div>
					{rows.map((r) => (
						<Link
							key={r.id}
							to="/logs"
							search={{ ...logs, expand: r.id }}
							className={`${GRID} border-b border-rule py-2 hover:bg-grid`}
						>
							<span className="text-ink-2" title={r.timeTitle}>
								{r.time}
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span className={`size-1.5 rounded-full ${r.statusDot}`} />
								<span className={r.statusTone}>{r.status}</span>
							</span>
							<span className="truncate text-ink-2">{r.host}</span>
							<span className="truncate text-ink-2">{r.key}</span>
							<span className={`truncate ${r.statusTone}`}>{r.outcome}</span>
							<span className="text-right text-ink-2">{r.latency}</span>
							<span className="text-right text-ink-2">{r.tokens}</span>
						</Link>
					))}
				</div>
			</div>
		</Section>
	);
}
