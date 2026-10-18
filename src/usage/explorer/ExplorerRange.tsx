import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { USAGE_RANGE_LABELS, USAGE_RANGES } from "@/api/hooks/usage";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Segmented } from "@/shared/Segmented";
import { useExplorer } from "./useExplorer";

const RANGE_OPTIONS = USAGE_RANGES.map((r) => ({
	value: r,
	label: USAGE_RANGE_LABELS[r],
}));

/** Today / this week / this month, or custom dates from a calendar. */
export function ExplorerRange() {
	const { live, set } = useExplorer();
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Segmented
				value={live.range}
				options={RANGE_OPTIONS}
				onChange={(range) => set({ range })}
			/>
			{live.range === "custom" && (
				<CustomRange
					from={live.from}
					to={live.to}
					onPick={(from, to) => set({ from, to })}
				/>
			)}
		</div>
	);
}

function CustomRange({
	from,
	to,
	onPick,
}: {
	from?: string;
	to?: string;
	onPick: (from: string, to: string) => void;
}) {
	const selected: DateRange | undefined = from
		? { from: new Date(from), to: to ? new Date(to) : undefined }
		: undefined;
	const label = selected?.from
		? `${selected.from.toLocaleDateString()} – ${selected.to?.toLocaleDateString() ?? "…"}`
		: "Pick dates";

	function handleSelect(next: DateRange | undefined) {
		if (!next?.from) return;
		// Whole days: the start of `from` to the end of `to` (or `from`).
		const start = new Date(next.from);
		start.setHours(0, 0, 0, 0);
		const end = new Date(next.to ?? next.from);
		end.setHours(23, 59, 59, 999);
		onPick(start.toISOString(), end.toISOString());
	}

	return (
		<Popover>
			<PopoverTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted">
				<CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
				{label}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-auto p-0">
				<Calendar
					mode="range"
					numberOfMonths={2}
					defaultMonth={selected?.from}
					selected={selected}
					onSelect={handleSelect}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
