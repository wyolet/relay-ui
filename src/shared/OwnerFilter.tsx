import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterOption } from "@/filters/types";
import { cn } from "@/lib/utils";
import { filterTriggerClassName, MultiCheckList } from "@/shared/MultiSelect";

/** The owner multi-select of an index table, fed by `useOwnerFilter`. */
export function OwnerFilter({
	filter: { options, selected, summary, setSelected: onChange },
}: {
	filter: {
		options: readonly FilterOption[];
		selected: readonly string[];
		summary: string;
		setSelected: (next: string[]) => void;
	};
}) {
	function toggle(value: string) {
		onChange(
			selected.includes(value)
				? selected.filter((v) => v !== value)
				: [...selected, value],
		);
	}

	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					filterTriggerClassName,
					selected.length > 0 && "border-field-accent/40 bg-input-wash",
				)}
			>
				<span className="text-muted-foreground">Owner:</span>
				<span className="max-w-48 truncate">{summary}</span>
				<ChevronDown
					className="size-3.5 text-muted-foreground"
					aria-hidden="true"
				/>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-2">
				<MultiCheckList
					options={options}
					selected={selected}
					onToggle={toggle}
					emptyLabel="owners"
				/>
				{selected.length > 0 && (
					<Button
						variant="ghost"
						className="mt-1 w-full justify-start"
						onClick={() => onChange([])}
					>
						Show all owners
					</Button>
				)}
			</PopoverContent>
		</Popover>
	);
}
