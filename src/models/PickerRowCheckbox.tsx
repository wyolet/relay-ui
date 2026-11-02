import type { CheckState } from "@/models/pickerCheckState";

export function PickerRowCheckbox({ state }: { state: CheckState }) {
	const base =
		"flex h-4 w-4 items-center justify-center rounded border shrink-0";
	if (state === "off")
		return <span className={`${base} border-input`} aria-hidden="true" />;
	if (state === "covered")
		return (
			<span
				className={`${base} bg-muted-foreground/30 border-muted-foreground/30 text-background`}
				aria-hidden="true"
			>
				<svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
					<title>covered</title>
					<path
						d="M2 6.5l2.5 2.5L10 3.5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</svg>
			</span>
		);
	if (state === "indeterminate")
		return (
			<span
				className={`${base} bg-primary border-primary text-primary-foreground`}
				aria-hidden="true"
			>
				<span className="block h-0.5 w-2 bg-current rounded" />
			</span>
		);
	return (
		<span
			className={`${base} bg-primary border-primary text-primary-foreground`}
			aria-hidden="true"
		>
			<svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
				<title>checked</title>
				<path
					d="M2 6.5l2.5 2.5L10 3.5"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		</span>
	);
}
