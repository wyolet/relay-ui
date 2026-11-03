import { TriangleAlert } from "lucide-react";
import { KIND_META } from "@/config/catalogRef";
import type { CatalogRef } from "@/lib/catalogRef";
import { describeRef, refReachText } from "@/models/pickerRefSummary";
import type { PickerIndex } from "@/models/usePickerCatalog";

export function PickerSelectionSummary({
	refs,
	index,
	warnings,
}: {
	refs: CatalogRef[];
	index: PickerIndex;
	/** Keyed by the ref as written. */
	warnings?: ReadonlyMap<string, string>;
}) {
	return (
		<div className="border-t border-border bg-muted/30">
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					Selected
				</div>
				<div className="text-[10px] text-muted-foreground tabular-nums">
					{refs.length} {refs.length === 1 ? "grant" : "grants"}
				</div>
			</div>
			<ul className="divide-y divide-border/40">
				{refs.map((r) => {
					const meta = KIND_META[r.kind];
					const Icon = meta.icon;
					const counts = refReachText(r, index);
					const warning = warnings?.get(r.raw);
					return (
						<li key={r.raw} className="flex items-center gap-3 px-3 py-2">
							<span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
								<Icon className="w-3 h-3" />
							</span>
							<div className="min-w-0 flex-1">
								<div className="text-[12px] text-foreground leading-tight">
									{describeRef(r, index)}
								</div>
								<div className="flex items-center gap-2 mt-0.5">
									<code className="text-[10px] font-mono text-muted-foreground">
										{r.raw}
									</code>
									{counts && (
										<span className="text-[10px] text-muted-foreground tabular-nums">
											· {counts}
										</span>
									)}
								</div>
								{warning && (
									<p className="mt-1 flex items-start gap-1 text-[11px] text-warning">
										<TriangleAlert
											className="mt-0.5 w-3 h-3 shrink-0"
											aria-hidden="true"
										/>
										{warning}
									</p>
								)}
							</div>
							<span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
								{meta.label}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
