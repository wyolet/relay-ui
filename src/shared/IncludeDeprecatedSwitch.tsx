import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface IncludeDeprecatedSwitchProps {
	value: boolean;
	onChange: (next: boolean) => void;
}

/**
 * Controlled box for `PolicySpec.includeDeprecated`. Persisted policy field —
 * also drives picker filtering / counts on the client so the UI matches what
 * the backend will permit at request time.
 */
export function IncludeDeprecatedSwitch({
	value,
	onChange,
}: IncludeDeprecatedSwitchProps) {
	return (
		<ToggleSwitch
			value={value}
			onChange={onChange}
			label="Include deprecated models"
			hint="Off by default. Pickers and counts ignore deprecated catalog rows unless this is on."
		/>
	);
}
