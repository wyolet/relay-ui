import type { BlockerGroup } from "@/api/types/errors";
import { AlertBanner } from "@/shared/AlertBanner";
import { Chip } from "@/shared/Chip";
import { blockerKindLabel } from "@/shared/deleteOutcome";

/** The rows that refused a delete, grouped by kind and the field naming the target. */
export function DeleteBlockers({
	groups,
}: {
	groups: readonly BlockerGroup[];
}) {
	return (
		<AlertBanner
			severity="error"
			title="Still in use"
			body={
				<ul className="divide-y divide-border">
					{groups.map((g) => (
						<li key={`${g.kind}:${g.field}`} className="px-3 py-2">
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-[11px] font-medium text-foreground">
									{blockerKindLabel(g.kind)}{" "}
									<code className="font-mono text-muted-foreground">
										{g.field}
									</code>
								</span>
								<span className="shrink-0 text-[10px] text-muted-foreground">
									{g.detachable
										? "Can be unlinked"
										: "Reassign or delete first"}
								</span>
							</div>
							<div className="mt-1.5 flex flex-wrap items-center gap-1">
								{(g.items ?? []).map((item) => (
									<Chip key={item.id} label={item.name} mono shape="box" />
								))}
								{g.hidden > 0 && (
									<span className="text-[11px] text-muted-foreground">
										+{g.hidden} hidden
									</span>
								)}
							</div>
						</li>
					))}
				</ul>
			}
		>
			Remove these references, then delete again.
		</AlertBanner>
	);
}
