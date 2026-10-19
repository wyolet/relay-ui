import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Model } from "@/api/types/model";
import { displayLabel } from "@/lib/displayLabel";
import { cn } from "@/lib/utils";
import { groupModelsByFamily } from "@/models/groupModelsByFamily";
import { StatusInline } from "@/shared/StatusBadge";

/** A detail page's model list, grouped by family and then product line. */
export function ModelsByFamily({
	models,
	empty,
}: {
	models: readonly Model[];
	/** Rendered instead of the list when `models` is empty. */
	empty: ReactNode;
}) {
	if (models.length === 0) return empty;
	const families = groupModelsByFamily(models);
	return (
		<div className="mt-2 flex flex-col gap-3">
			<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{models.length} model{models.length === 1 ? "" : "s"} ·{" "}
				{families.length} famil{families.length === 1 ? "y" : "ies"}
			</div>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<ul className="divide-y divide-border">
					{families.map((g) => (
						<li key={g.family}>
							<div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
									{g.family}
								</span>
								<GroupCount count={g.count} />
							</div>
							<ul className="divide-y divide-border">
								{g.unlined.map((m) => (
									<ModelRow key={m.metadata.name} model={m} />
								))}
								{g.lines.map((l) => (
									<li key={l.line}>
										<div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
											<span className="text-[11px] font-medium text-muted-foreground">
												{l.line}
											</span>
											<GroupCount count={l.models.length} />
										</div>
										<ul className="divide-y divide-border">
											{l.models.map((m) => (
												<ModelRow key={m.metadata.name} model={m} indented />
											))}
										</ul>
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function GroupCount({ count }: { count: number }) {
	return (
		<span className="text-[10px] text-muted-foreground tabular-nums">
			{count}
		</span>
	);
}

function ModelRow({
	model,
	indented = false,
}: {
	model: Model;
	/** Nests the row under a product-line subheading. */
	indented?: boolean;
}) {
	return (
		<li
			className={cn(
				"flex items-center justify-between gap-3 py-1.5 pr-3 hover:bg-muted/30",
				indented ? "pl-6" : "pl-3",
			)}
		>
			<div className="min-w-0 flex items-center gap-2">
				<Link
					to="/models/$name"
					params={{ name: model.metadata.name }}
					className="text-sm text-foreground hover:underline truncate"
				>
					{displayLabel(model.metadata)}
				</Link>
				<code className="font-mono text-[10px] text-muted-foreground truncate">
					{model.metadata.name}
				</code>
			</div>
			<StatusInline enabled={model.spec.enabled !== false} />
		</li>
	);
}
