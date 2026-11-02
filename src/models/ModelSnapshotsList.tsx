import { sortSnapshots } from "@/models/modelDetail";

export function ModelSnapshotsList({
	snapshots,
}: {
	snapshots: { name: string; originalName?: string; releasedAt?: string }[];
}) {
	return (
		<ul className="divide-y divide-border">
			{sortSnapshots(snapshots).map((s) => (
				<li
					key={s.name}
					className="py-2 first:pt-0 last:pb-0 flex items-baseline justify-between gap-3"
				>
					<div className="min-w-0">
						<div className="font-mono text-xs text-foreground truncate">
							{s.name}
						</div>
						{s.originalName && s.originalName !== s.name && (
							<div className="font-mono text-[10px] text-muted-foreground truncate">
								upstream {s.originalName}
							</div>
						)}
					</div>
					<div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
						{s.releasedAt || "—"}
					</div>
				</li>
			))}
		</ul>
	);
}
