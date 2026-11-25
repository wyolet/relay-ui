/** A rate limit's rules in short form ("60 RPM", "1.5M input TPM"), side by side. */
export function RuleShortList({ rules }: { rules: readonly string[] }) {
	if (rules.length === 0) {
		return <span className="text-[11px] text-muted-foreground">No rules</span>;
	}
	return (
		<span className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
			{rules.map((rule) => (
				<span key={rule} className="whitespace-nowrap">
					{rule}
				</span>
			))}
		</span>
	);
}
