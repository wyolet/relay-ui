import { Switch } from "@/components/ui/switch";

interface IncludeDeprecatedSwitchProps {
	value: boolean;
	onChange: (next: boolean) => void;
}

/**
 * Controlled box that toggles whether deprecated models are surfaced in
 * pickers / counts. Purely a UI filter — the policy itself is unaware.
 */
export function IncludeDeprecatedSwitch({
	value,
	onChange,
}: IncludeDeprecatedSwitchProps) {
	return (
		<div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2">
			<Switch
				checked={value}
				onCheckedChange={onChange}
				aria-label="Include deprecated models"
			/>
			<div className="leading-tight">
				<div className="text-[12px] font-medium text-foreground">
					Include deprecated models
				</div>
				<div className="text-[10px] text-muted-foreground">
					Off by default. Pickers and counts ignore deprecated catalog rows
					unless this is on.
				</div>
			</div>
		</div>
	);
}
