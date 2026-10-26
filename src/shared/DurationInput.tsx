import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DURATION_UNITS,
	type DurationDraft,
	isDurationUnit,
} from "@/lib/durationNanos";

const UNIT_ITEMS = DURATION_UNITS.map((u) => ({
	value: u.value,
	label: u.label,
}));

/** An amount plus a minutes/hours/days unit. */
export function DurationInput({
	value,
	onChange,
	label,
	disabled,
	error,
	errorId,
}: {
	value: DurationDraft;
	onChange: (next: DurationDraft) => void;
	label: string;
	disabled?: boolean;
	error?: string;
	errorId?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="inline-flex items-center gap-2">
				<Input
					type="number"
					min={0}
					inputMode="decimal"
					value={value.amount}
					onChange={(e) =>
						onChange({ ...value, amount: Number(e.target.value) || 0 })
					}
					disabled={disabled}
					aria-label={label}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className="w-28 tabular-nums"
				/>
				<Select
					value={value.unit}
					items={UNIT_ITEMS}
					onValueChange={(v) =>
						isDurationUnit(v) && onChange({ ...value, unit: v })
					}
					disabled={disabled}
				>
					<SelectTrigger className="w-32" aria-label={`${label} unit`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{UNIT_ITEMS.map((u) => (
							<SelectItem key={u.value} value={u.value}>
								{u.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{error && (
				<p id={errorId} className="text-xs text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
