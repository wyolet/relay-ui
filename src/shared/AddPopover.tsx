import { ChevronDown, Plus } from "lucide-react";
import type { ReactNode } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { filterTriggerClassName } from "@/shared/MultiSelect";
import { OptionRow } from "@/shared/OptionRow";

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
	const shown = groups.filter((g) => g.options.length > 0);
	return (
		<Popover>
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
							{g.title && (
								<div className="px-2 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									{g.title}
								</div>
							)}
							<ul>
								{g.options.map((o) => (
									<li key={o.id}>
										<OptionRow
											onClick={() => onAdd(o)}
											className="rounded px-2 py-1.5"
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
