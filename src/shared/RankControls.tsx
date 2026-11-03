import { ArrowDown, ArrowUp, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

/** Up, down and remove for one row of an ordered list; moves stay within `count`. */
export function RankControls({
	label,
	index,
	count,
	onMove,
	onRemove,
}: {
	label: string;
	index: number;
	count: number;
	onMove: (index: number, delta: -1 | 1) => void;
	onRemove: () => void;
}) {
	return (
		<>
			<IconButton
				icon={ArrowUp}
				label={`Move ${label} up`}
				disabled={index === 0}
				onClick={() => onMove(index, -1)}
			/>
			<IconButton
				icon={ArrowDown}
				label={`Move ${label} down`}
				disabled={index === count - 1}
				onClick={() => onMove(index, 1)}
			/>
			<IconButton icon={X} label={`Remove ${label}`} onClick={onRemove} />
		</>
	);
}
