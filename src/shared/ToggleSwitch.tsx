import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "@/shared/FieldError";

interface ToggleSwitchProps {
	value: boolean;
	onChange: (next: boolean) => void;
	label: string;
	hint?: string;
	disabled?: boolean;
	/** Shown under the row; marks the switch invalid. */
	error?: string;
}

/**
 * Boxed labelled switch for form-level on/off settings. Mirrors the visual
 * weight of an input row — use instead of a bare checkbox when the toggle
 * stands alone as a decision (passthrough, payload logging, …).
 */
export function ToggleSwitch({
	value,
	onChange,
	label,
	hint,
	disabled,
	error,
}: ToggleSwitchProps) {
	const errorId = useId();
	return (
		<>
			<div
				className={`flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 ${
					disabled ? "opacity-60" : ""
				}`}
			>
				<Switch
					checked={value}
					onCheckedChange={onChange}
					disabled={disabled}
					aria-label={label}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
				/>
				<button
					type="button"
					onClick={() => !disabled && onChange(!value)}
					disabled={disabled}
					className="leading-tight text-left flex-1 disabled:cursor-default"
				>
					<div className="text-[12px] font-medium text-foreground">{label}</div>
					{hint && (
						<div className="text-[10px] text-muted-foreground">{hint}</div>
					)}
				</button>
			</div>
			<FieldError id={errorId} message={error} />
		</>
	);
}
