import { Ban, type LucideIcon, Pencil, Trash2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isPermissionLevel, type PermissionLevel } from "@/lib/ownership";

/**
 * Triple switch over the cumulative permission ladder off → write → delete.
 * Exactly one rung is always selected; picking a rung that's already active
 * is a no-op (the underlying toggle can't deselect to empty).
 */
const RUNGS: {
	value: PermissionLevel;
	label: string;
	icon: LucideIcon;
	activeClass: string;
}[] = [
	{
		value: "off",
		label: "Read-only",
		icon: Ban,
		activeClass: "data-[state=on]:bg-muted data-[state=on]:text-foreground",
	},
	{
		value: "write",
		label: "Write",
		icon: Pencil,
		activeClass: "data-[state=on]:bg-primary/15 data-[state=on]:text-primary",
	},
	{
		value: "delete",
		label: "Delete",
		icon: Trash2,
		activeClass:
			"data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive",
	},
];

export function PermissionLevelSwitch({
	value,
	onChange,
	disabled,
	ariaLabel,
}: {
	value: PermissionLevel;
	onChange: (next: PermissionLevel) => void;
	disabled?: boolean;
	ariaLabel: string;
}) {
	return (
		<ToggleGroup
			value={[value]}
			onValueChange={(groupValue) => {
				const next = groupValue[0];
				if (isPermissionLevel(next) && next !== value) onChange(next);
			}}
			variant="outline"
			disabled={disabled}
			aria-label={ariaLabel}
		>
			{RUNGS.map(({ value: rung, label, icon: Icon, activeClass }) => (
				<ToggleGroupItem
					key={rung}
					value={rung}
					aria-label={label}
					className={activeClass}
				>
					<Icon className="size-3.5" />
					{label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
