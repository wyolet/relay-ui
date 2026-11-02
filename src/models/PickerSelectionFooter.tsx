import { Chip } from "@/shared/Chip";

export function PickerSelectionFooter({
	refs,
	onRemove,
	emptyText,
}: {
	refs: string[];
	onRemove: (raw: string) => void;
	emptyText: string;
}) {
	if (refs.length === 0) {
		return (
			<div className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
				{emptyText}
			</div>
		);
	}
	return (
		<div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-1">
			{refs.map((r) => (
				<Chip
					key={r}
					shape="box"
					tone="primary"
					mono
					label={r}
					onRemove={() => onRemove(r)}
				/>
			))}
		</div>
	);
}
