interface EnabledFieldProps {
	value: boolean;
	onChange: (next: boolean) => void;
	label?: string;
	hint?: string;
}

export function EnabledField({
	value,
	onChange,
	label = "Enabled",
	hint,
}: EnabledFieldProps) {
	return (
		<label className="flex items-start gap-3 cursor-pointer">
			<input
				type="checkbox"
				checked={value}
				onChange={(e) => onChange(e.currentTarget.checked)}
				className="mt-0.5 h-3.5 w-3.5 accent-primary"
			/>
			<span className="flex flex-col gap-0.5">
				<span className="text-sm text-foreground">{label}</span>
				{hint && (
					<span className="text-[11px] text-muted-foreground leading-snug">
						{hint}
					</span>
				)}
			</span>
		</label>
	);
}
