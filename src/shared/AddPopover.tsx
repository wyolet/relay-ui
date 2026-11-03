import { ChevronDown, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	menuItemClassName,
	menuLabelClassName,
} from "@/components/ui/menu-surface";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { filterTriggerClassName } from "@/shared/MultiSelect";
import { OptionRow } from "@/shared/OptionRow";

// Rows read as menu items: the menu's size and its highlight, not a list row's.
const optionClassName = cn(
	menuItemClassName,
	"gap-2 hover:bg-popover-hover focus-visible:bg-popover-hover focus-visible:ring-0",
);

export interface AddGroup<T> {
	title?: string;
	options: readonly T[];
}

/** An "Add …" trigger opening the rows that may still join a list, in titled groups. */
export function AddPopover<T extends { id: string }>({
	label,
	groups,
	renderOption,
	onAdd,
}: {
	label: string;
	groups: readonly AddGroup<T>[];
	renderOption: (option: T) => ReactNode;
	onAdd: (option: T) => void;
}) {
	const [open, setOpen] = useState(false);
	const shown = groups.filter((g) => g.options.length > 0);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={`${filterTriggerClassName} self-start`}
				disabled={shown.length === 0}
			>
				<Plus className="size-3.5" aria-hidden />
				{label}
				<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80 p-1">
				<div className="flex max-h-80 flex-col overflow-y-auto">
					{shown.map((g) => (
						<div key={g.title ?? ""}>
							{g.title && <div className={menuLabelClassName}>{g.title}</div>}
							<ul>
								{g.options.map((o) => (
									<li key={o.id}>
										<OptionRow
											onClick={() => {
												onAdd(o);
												setOpen(false);
											}}
											className={optionClassName}
										>
											{renderOption(o)}
										</OptionRow>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
