/** A select option with a one-line explanation under its label. */
export function OptionWithHint({
	label,
	hint,
}: {
	label: string;
	hint: string;
}) {
	return (
		<span className="flex flex-col items-start gap-1 py-0.5 whitespace-normal">
			<span className="text-sm leading-tight text-foreground">{label}</span>
			<span className="text-xs leading-snug text-muted-foreground">{hint}</span>
		</span>
	);
}
