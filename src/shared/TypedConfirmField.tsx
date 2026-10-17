import { type ReactNode, useId } from "react";
import { Input } from "@/components/ui/input";

/** The "type the name to confirm" input guarding an irreversible action. */
export function TypedConfirmField({
	expected,
	value,
	onChange,
	label,
}: {
	expected: string;
	value: string;
	onChange: (value: string) => void;
	label: ReactNode;
}) {
	const inputId = useId();
	return (
		<div>
			<label
				htmlFor={inputId}
				className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1"
			>
				{label}
			</label>
			<Input
				id={inputId}
				type="text"
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
				placeholder={expected}
				autoFocus
				autoComplete="off"
				spellCheck={false}
				className="font-mono"
			/>
		</div>
	);
}
