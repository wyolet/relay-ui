import { Switch as ShadcnSwitch } from "@/components/ui/switch";

interface SwitchProps {
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	label: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
	return (
		<ShadcnSwitch
			checked={checked}
			disabled={disabled}
			aria-label={label}
			onCheckedChange={onChange}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}
