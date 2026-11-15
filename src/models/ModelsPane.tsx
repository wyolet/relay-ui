import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { displayLabel } from "@/lib/displayLabel";
import type { LineGroup } from "@/lib/modelsByHost";
import type { ModelUsage } from "@/lib/pricingMatrix";
import { ModelLineColumns, ModelLineRow } from "@/models/ModelLineRow";
import { useModelDelete } from "@/models/useModelLineActions";
import type { ModelsPaneView } from "@/models/useModelsByHost";
import { MatrixHostLogo } from "@/pricing/PricingHostGrid";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { fmtMoneyCompact } from "@/usage/format";

/** The open rail entry's models: a host's by family, or In use's by host. */
export function ModelsPane({
	pane,
	narrowing,
}: {
	pane: ModelsPaneView;
	/** A search or filter is on, so an empty pane means no match. */
	narrowing: boolean;
}) {
	const del = useModelDelete();
	return (
		<section className="grid min-w-0 content-start gap-5">
			<PaneHeader pane={pane} />
			{pane.groups.length === 0 ? (
				<p className="text-label text-ink-2">{emptyText(pane, narrowing)}</p>
			) : (
				<div className="overflow-x-auto">
					<div className="grid min-w-[52rem] grid-cols-1 gap-6">
						<ModelLineColumns />
						{pane.groups.map((group) => (
							<div key={group.key} className="grid grid-cols-1">
								<GroupHeading group={group} />
								{group.lines.map((line) => (
									<ModelLineRow
										key={line.model.metadata.id ?? line.model.metadata.name}
										line={line}
										onDelete={() =>
											del.request({
												id: line.model.metadata.id ?? "",
												name: line.model.metadata.name,
												label: displayLabel(line.model.metadata),
											})
										}
									/>
								))}
							</div>
						))}
					</div>
				</div>
			)}
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
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
				<span className="shrink-0 text-meta text-ink-3 tabular-nums">
					{pane.models} model{pane.models === 1 ? "" : "s"}
					{spendText(pane.usage)}
				</span>
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

function spendText(usage: ModelUsage | undefined): string {
	if (usage?.usd != null)
		return ` · ${fmtMoneyCompact(usage.usd, "USD")} last 7 days`;
	if (usage?.requests) return " · unpriced traffic last 7 days";
	return "";
}

/** A family heading, or a host's (logo, and a link to its own pane). */
function GroupHeading({ group }: { group: LineGroup }) {
	if (!group.label) return null;
	return (
		<h3 className="border-b border-rule py-2 text-foot font-medium tracking-wide text-ink-2 uppercase">
			{group.label}
		</h3>
	);
}
