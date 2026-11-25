import { useId } from "react";
import { Input } from "@/components/ui/input";
import {
	PER_OPTIONS,
	type RateLimitMeter,
	type RateLimitPer,
} from "@/rate-limits/easyRateLimit";
import { FieldError } from "@/shared/FieldError";
import { Segmented } from "@/shared/Segmented";

const METER_OPTIONS: { value: RateLimitMeter; label: string }[] = [
	{ value: "requests", label: "Requests" },
	{ value: "tokens", label: "Tokens" },
];

const AMOUNT_PLACEHOLDER: Record<RateLimitMeter, string> = {
	requests: "60",
	tokens: "100000",
};

const FIELD_LABEL =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1";

/** A rate limit's one rule: how many, of what, per which window. */
export function RateLimitFields({
	amount,
	meter,
	per,
	onAmountChange,
	onMeterChange,
	onPerChange,
	amountError,
}: {
	amount: string;
	meter: RateLimitMeter;
	per: RateLimitPer;
	onAmountChange: (raw: string) => void;
	onMeterChange: (meter: RateLimitMeter) => void;
	onPerChange: (per: RateLimitPer) => void;
	amountError?: string;
}) {
	const amountErrorId = useId();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className={FIELD_LABEL}>Count</div>
				<Segmented
					options={METER_OPTIONS}
					value={meter}
					onChange={onMeterChange}
				/>
			</div>
			<div>
				<div className={FIELD_LABEL}>Amount</div>
				<Input
					type="text"
					inputMode="numeric"
					value={amount}
					onChange={(e) => onAmountChange(e.currentTarget.value)}
					placeholder={AMOUNT_PLACEHOLDER[meter]}
					className="w-full max-w-xs tabular-nums"
					aria-label={`Maximum ${meter}`}
					aria-invalid={amountError ? true : undefined}
					aria-describedby={amountError ? amountErrorId : undefined}
				/>
				<FieldError id={amountErrorId} message={amountError} />
			</div>
			<div>
				<div className={FIELD_LABEL}>Per</div>
				<Segmented options={PER_OPTIONS} value={per} onChange={onPerChange} />
			</div>
		</div>
	);
}
