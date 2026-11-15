import { Link } from "@tanstack/react-router";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { displayLabel } from "@/lib/displayLabel";
import { fmtCompact } from "@/lib/format";
import {
	fmtReleaseMonth,
	isDeprecatedModel,
	type ModelLine,
} from "@/lib/modelsByHost";
import { cn } from "@/lib/utils";
import { ModelCapabilityIcons } from "@/models/ModelCapabilities";
import { activeCapabilities } from "@/models/modelDetail";
import { useModelLineActions } from "@/models/useModelLineActions";
import { RateValue } from "@/pricing/MeterGrid";
import { AddPriceLink } from "@/pricing/ModelPrice";
import { Switch } from "@/shared/Switch";
import { fmtMoneyCompact } from "@/usage/format";

const GRID =
	"grid grid-cols-[minmax(10rem,2fr)_minmax(5.5rem,1fr)_minmax(3.5rem,1fr)_minmax(4rem,1fr)_repeat(2,minmax(4.5rem,1fr))_minmax(3.5rem,1fr)_minmax(4.5rem,1fr)_4.5rem] items-center gap-x-3";

/** The pane's column labels, on the rows' grid. */
export function ModelLineColumns() {
	return (
		<div className={`${GRID} border-b border-rule pb-2 text-meta text-ink-3`}>
			<span>Model</span>
			<span>Capabilities</span>
			<span className="text-right">Context</span>
			<span className="text-right">Released</span>
			<span className="text-right" title="Per 1M tokens">
				Input
			</span>
			<span className="text-right" title="Per 1M tokens">
				Output
			</span>
			<span className="text-right" title="Requests, last 7 days">
				Req 7d
			</span>
			<span className="text-right" title="Spend, last 7 days">
				Spend 7d
			</span>
			<span className="pr-3 text-right">On</span>
		</div>
	);
}

/** One model as one host serves it: specs, this host's price, its traffic. */
export function ModelLineRow({ line }: { line: ModelLine }) {
	const { model, host, price, usage } = line;
	const actions = useModelLineActions(model);

	return (
		<div
			className={`${GRID} border-b border-rule py-2 text-label tabular-nums ${actions.enabled ? "" : "opacity-60"}`}
		>
			<span className="grid min-w-0">
				<span className="flex min-w-0 items-center gap-2">
					<Link
						to="/models/$name"
						params={{ name: model.metadata.name }}
						className="truncate text-foreground hover:underline"
					>
						{displayLabel(model.metadata)}
					</Link>
					{!actions.enabled && <Tag>off</Tag>}
					{isDeprecatedModel(model) && <Tag>deprecated</Tag>}
					<PlanIssueDot kind="model" id={model.metadata.id} />
				</span>
				<code className="truncate font-mono text-foot text-ink-3">
					{model.metadata.name}
				</code>
			</span>
			<ModelCapabilityIcons
				caps={activeCapabilities(model.spec.capabilities)}
			/>
			<NumberCell
				value={
					model.spec.contextWindowTotal
						? fmtCompact(model.spec.contextWindowTotal)
						: null
				}
			/>
			<NumberCell value={fmtReleaseMonth(model.spec.releaseDate)} />
			{!price || !host ? (
				<span className="col-span-2 text-right text-ink-3">—</span>
			) : price.unpriced ? (
				<AddPriceLink
					hostId={host.id}
					modelId={price.model.id}
					className="col-span-2 text-right text-warn hover:underline"
					title={`Add a price on ${host.label}`}
				>
					Unpriced
				</AddPriceLink>
			) : (
				<>
					<RateValue
						cell={price.cells["tokens.input"]}
						currency={price.currency}
					/>
					<RateValue
						cell={price.cells["tokens.output"]}
						currency={price.currency}
					/>
				</>
			)}
			<NumberCell value={usage?.requests ? fmtCompact(usage.requests) : null} />
			<NumberCell
				value={usage?.usd != null ? fmtMoneyCompact(usage.usd, "USD") : null}
			/>
			{/* pr-3 holds the switch's enlarged hit area inside the row. */}
			<span className="flex items-center justify-end pr-3">
				<Switch
					checked={actions.enabled}
					onChange={(next) => void actions.setEnabled(next)}
					disabled={!actions.canEdit}
					label={`${actions.enabled ? "Disable" : "Enable"} ${displayLabel(model.metadata)}`}
				/>
			</span>
		</div>
	);
}

function Tag({ children }: { children: string }) {
	return <span className="shrink-0 text-foot text-ink-3">{children}</span>;
}

/** A right-aligned figure, or a quiet dash without one. */
function NumberCell({ value }: { value: string | null }) {
	return (
		<span className={cn("text-right", value == null && "text-ink-3")}>
			{value ?? "—"}
		</span>
	);
}
