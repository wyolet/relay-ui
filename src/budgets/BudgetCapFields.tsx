import { useId } from "react";
import {
	BUDGET_MODES,
	BUDGET_PERIODS,
	type BudgetMode,
	type BudgetPeriod,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/shared/Segmented";

const PERIOD_OPTIONS = BUDGET_PERIODS.map((p) => ({
	value: p,
	label: PERIOD_LABELS[p],
}));
const MODE_OPTIONS = BUDGET_MODES.map((m) => ({
	value: m,
	label: MODE_LABELS[m].label,
}));

const FIELD_LABEL =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1";

/** A spend cap's amount, period and mode. */
export function BudgetCapFields({
	amountUsd,
	period,
	mode,
	onAmountChange,
	onPeriodChange,
	onModeChange,
	amountError,
}: {
	amountUsd: string;
	period: BudgetPeriod;
	mode: BudgetMode;
	onAmountChange: (raw: string) => void;
	onPeriodChange: (period: BudgetPeriod) => void;
	onModeChange: (mode: BudgetMode) => void;
	amountError?: string;
}) {
	const amountErrorId = useId();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className={FIELD_LABEL}>Amount (USD)</div>
				<Input
					type="text"
					inputMode="decimal"
					value={amountUsd}
					onChange={(e) => onAmountChange(e.currentTarget.value)}
					placeholder="2000"
					className="w-full max-w-xs tabular-nums"
					aria-label="Amount in USD"
					aria-invalid={amountError ? true : undefined}
					aria-describedby={amountError ? amountErrorId : undefined}
				/>
				{amountError && (
					<p id={amountErrorId} className="mt-1.5 text-[11px] text-destructive">
						{amountError}
					</p>
				)}
			</div>
			<div>
				<div className={FIELD_LABEL}>Period</div>
				<Segmented
					options={PERIOD_OPTIONS}
					value={period}
					onChange={onPeriodChange}
				/>
			</div>
			<div>
				<div className={FIELD_LABEL}>Mode</div>
				<Segmented
					options={MODE_OPTIONS}
					value={mode}
					onChange={onModeChange}
				/>
				<p className="mt-1.5 text-[11px] text-muted-foreground">
					{MODE_LABELS[mode].hint}
				</p>
			</div>
		</div>
	);
}
