interface SwitchProps {
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	label: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={(e) => {
				e.stopPropagation();
				onChange(!checked);
			}}
			className={[
				"relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				checked
					? "bg-brand-600"
					: "bg-neutral-300 dark:bg-neutral-700",
			].join(" ")}
		>
			<span
				aria-hidden="true"
				className={[
					"inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
					checked ? "translate-x-3.5" : "translate-x-0.5",
				].join(" ")}
			/>
		</button>
	);
}
