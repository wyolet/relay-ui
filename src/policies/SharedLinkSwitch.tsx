import { Switch } from "@/shared/Switch";

/** The `shared` switch on one rate-limit or budget link row. */
export function SharedLinkSwitch({
	value,
	onChange,
	linkLabel,
}: {
	value: boolean;
	onChange: (next: boolean) => void;
	linkLabel: string;
}) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<span className="text-[11px] text-muted-foreground">Shared</span>
			<Switch
				checked={value}
				onChange={onChange}
				label={`Share ${linkLabel} across the bound account`}
			/>
		</span>
	);
}
