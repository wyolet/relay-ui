import { type ReactNode, useId } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface HostSelectProps {
	value: string;
	options: readonly { value: string; label: string }[];
	onChange: (hostId: string) => void;
	error?: string;
	disabled?: boolean;
	/** Muted note under the select, e.g. why the host is fixed. */
	hint?: ReactNode;
}

/** Labeled host picker for resource forms; the value is the host id. */
export function HostSelect({
	value,
	options,
	onChange,
	error,
	disabled,
	hint,
}: HostSelectProps) {
	const errorId = useId();
	return (
		<div>
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
				Host
			</div>
			<Select
				value={value}
				items={options}
				onValueChange={(v) => onChange(v ?? "")}
				disabled={disabled}
			>
				<SelectTrigger
					className="w-full max-w-md"
					aria-label="Host"
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
				>
					<SelectValue placeholder="Pick a host…" />
				</SelectTrigger>
				<SelectContent>
					{options.map((h) => (
						<SelectItem key={h.value} value={h.value}>
							{h.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && (
				<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
					{error}
				</p>
			)}
			{hint && (
				<p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
			)}
		</div>
	);
}
