import { ChevronDown, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Chip } from "@/shared/Chip";

/** Picks any number of values out of a closed set: removable chips for what is
 * chosen, a checkbox dropdown to add more. */
export function TokenMultiSelect({
	options,
	values,
	onChange,
	label,
	invalid,
}: {
	options: readonly string[];
	values: string[];
	onChange: (next: string[]) => void;
	label: string;
	invalid?: boolean;
}) {
	function toggle(option: string) {
		onChange(
			values.includes(option)
				? values.filter((v) => v !== option)
				: [...values, option],
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{values.map((v) => (
				<Chip
					key={v}
					label={v}
					mono
					tone="primary"
					shape="box"
					onRemove={() => onChange(values.filter((x) => x !== v))}
				/>
			))}
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						buttonVariants({ variant: "outline" }),
						invalid && "border-destructive",
					)}
					aria-label={label}
				>
					{values.length === 0 ? (
						<>
							<Plus className="w-3.5 h-3.5" />
							{label}
						</>
					) : (
						<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
					{options.map((o) => (
						<DropdownMenuCheckboxItem
							key={o}
							checked={values.includes(o)}
							onCheckedChange={() => toggle(o)}
							closeOnClick={false}
						>
							<span className="font-mono">{o}</span>
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
