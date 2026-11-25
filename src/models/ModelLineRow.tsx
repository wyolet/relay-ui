import { displayLabel } from "@/lib/displayLabel";
import { fmtCompact } from "@/lib/format";
import { fmtReleaseMonth, type ModelLine } from "@/lib/modelsByHost";
import { ModelCapabilityIcons } from "@/models/ModelCapabilities";
import { ModelNameCell } from "@/models/ModelNameCell";
import { activeCapabilities } from "@/models/modelDetail";
import { useModelLineActions } from "@/models/useModelLineActions";
import { RateValue } from "@/pricing/MeterGrid";
import { AddPriceLink } from "@/pricing/ModelPrice";
import {
	LineColumns,
	LineRow,
	NumberCell,
	SwitchCell,
} from "@/shared/LineGrid";
import { fmtMoneyCompact } from "@/usage/format";

// Under 53.5rem (the full tracks plus gaps) the `@container` pane drops two columns rather than scroll.
const COLS =
	"grid-cols-[minmax(13rem,2fr)_minmax(5.5rem,1fr)_minmax(3.5rem,1fr)_minmax(4rem,1fr)_repeat(2,minmax(4.5rem,1fr))_minmax(3.5rem,1fr)_minmax(4.5rem,1fr)_4.5rem] @max-[53.5rem]:grid-cols-[minmax(13rem,2fr)_minmax(3.5rem,1fr)_repeat(2,minmax(4.5rem,1fr))_minmax(3.5rem,1fr)_minmax(4.5rem,1fr)_4.5rem]";
const WIDE_ONLY = "@max-[53.5rem]:hidden";

/** The narrow template's minimum, for the pane's scroll box. */
export const MODEL_LINE_MIN_WIDTH = "min-w-[42.5rem]";

/** The pane's column labels, on the rows' grid. */
export function ModelLineColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Model</span>
			<span className={WIDE_ONLY}>Capabilities</span>
			<span className="text-right">Context</span>
			<span className={`text-right ${WIDE_ONLY}`}>Released</span>
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
		</LineColumns>
	);
}

/** One model as one host serves it: specs, this host's price, its traffic. */
export function ModelLineRow({ line }: { line: ModelLine }) {
	const { model, host, price, usage } = line;
	const actions = useModelLineActions(model);

	return (
		<LineRow cols={COLS} dimmed={!actions.enabled}>
			<ModelNameCell model={model} enabled={actions.enabled} />
			<span className={WIDE_ONLY}>
				<ModelCapabilityIcons
					caps={activeCapabilities(model.spec.capabilities)}
				/>
			</span>
			<NumberCell
				value={
					model.spec.contextWindowTotal
						? fmtCompact(model.spec.contextWindowTotal)
						: null
				}
			/>
			<NumberCell
				value={fmtReleaseMonth(model.spec.releaseDate)}
				className={WIDE_ONLY}
			/>
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
			<SwitchCell
				checked={actions.enabled}
				onChange={(next) => void actions.setEnabled(next)}
				disabled={!actions.canEdit}
				label={`${actions.enabled ? "Disable" : "Enable"} ${displayLabel(model.metadata)}`}
			/>
		</LineRow>
	);
}
