import { AlertCircle } from "lucide-react";
import { Chip } from "@/shared/Chip";

export function PickerSelectionFooter({
	refs,
	onRemove,
}: {
	refs: string[];
	onRemove: (raw: string) => void;
}) {
	if (refs.length === 0) {
		return (
			<div className="flex items-start gap-1.5 border-t border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
				<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
				<span>
					Nothing selected — an empty grant means{" "}
					<strong>full catalog access</strong>. Pick at least one entry to
					restrict it.
				</span>
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
