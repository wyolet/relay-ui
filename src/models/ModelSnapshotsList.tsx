import { sortSnapshots } from "@/models/modelDetail";

export function ModelSnapshotsList({
	snapshots,
}: {
	snapshots: { name: string; originalName?: string; releasedAt?: string }[];
}) {
	return (
		<ul className="grid grid-cols-1">
			{sortSnapshots(snapshots).map((s) => (
				<li
					key={s.name}
					className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0"
				>
					<span className="grid min-w-0">
						<code className="truncate font-mono text-meta text-foreground">
							{s.name}
						</code>
						{s.originalName && s.originalName !== s.name && (
							<code className="truncate font-mono text-foot text-ink-3">
								upstream {s.originalName}
							</code>
						)}
					</span>
					{s.releasedAt && (
						<span className="shrink-0 text-meta text-ink-3 tabular-nums">
							{s.releasedAt}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}
