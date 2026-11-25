import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import type { ModelUsage } from "@/lib/pricingMatrix";
import { FamilyHeading } from "@/models/FamilyHeading";
import {
	MODEL_LINE_MIN_WIDTH,
	ModelLineColumns,
	ModelLineRow,
} from "@/models/ModelLineRow";
import type { ModelsPaneView } from "@/models/useModelsByHost";
import { MatrixHostLogo } from "@/pricing/PricingHostGrid";
import { type Fact, Facts } from "@/shared/Facts";
import { fmtMoneyCompact } from "@/usage/format";

/** The open rail entry's models: a host's by family, or In use as one list. */
export function ModelsPane({
	pane,
	narrowing,
}: {
	pane: ModelsPaneView;
	/** A search or filter is on, so an empty pane means no match. */
	narrowing: boolean;
}) {
	return (
		<section className="@container grid min-w-0 content-start gap-5">
			<PaneHeader pane={pane} />
			{pane.groups.length === 0 ? (
				<p className="text-label text-ink-2">{emptyText(pane, narrowing)}</p>
			) : (
				<div className="overflow-x-auto">
					<div className={`grid grid-cols-1 gap-6 ${MODEL_LINE_MIN_WIDTH}`}>
						<ModelLineColumns />
						{pane.groups.map((group) => (
							<div key={group.key} className="grid grid-cols-1">
								{group.label && <FamilyHeading label={group.label} />}
								{group.lines.map((line) => (
									<ModelLineRow
										key={line.model.metadata.id ?? line.model.metadata.name}
										line={line}
									/>
								))}
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

function emptyText(pane: ModelsPaneView, narrowing: boolean): string {
	if (pane.loading) return "Loading usage…";
	if (narrowing) return "No models here match the current filter.";
	if (pane.host) return "This host serves no models the filter shows.";
	return "No traffic in the last 7 days.";
}

function PaneHeader({ pane }: { pane: ModelsPaneView }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
			<div className="flex min-w-0 items-center gap-3">
				{pane.host ? (
					<MatrixHostLogo host={pane.host} size={28} />
				) : (
					<Activity className="size-5 text-ink-2" aria-hidden />
				)}
				<h2 className="truncate font-display text-section text-foreground">
					{pane.title}
				</h2>
				<Facts items={paneFacts(pane.models, pane.usage)} />
			</div>
			{pane.host && (
				<Link
					to="/hosts/$name"
					params={{ name: pane.host.slug }}
					className="text-meta text-ink-3 hover:text-foreground"
				>
					Host →
				</Link>
			)}
		</div>
	);
}

function paneFacts(models: number, usage: ModelUsage | undefined): Fact[] {
	const facts: Fact[] = [{ label: "Models", value: models }];
	if (usage?.usd != null)
		facts.push({
			label: "Spend, 7 days",
			value: fmtMoneyCompact(usage.usd, "USD"),
		});
	else if (usage?.requests)
		facts.push({ label: "Spend, 7 days", value: "Unpriced" });
	return facts;
}
