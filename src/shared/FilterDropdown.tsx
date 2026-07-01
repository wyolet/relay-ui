import { Check, ChevronDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FilterDropdownOption<T extends string> {
	value: T;
	label: string;
}

interface FilterDropdownProps<T extends string> {
	label?: string;
	value: T;
	options: readonly FilterDropdownOption<T>[];
	onChange: (value: T) => void;
	align?: "start" | "end" | "center";
	/** Highlight the chip when the filter is narrowing (not at its default). */
	active?: boolean;
	className?: string;
}

export function FilterDropdown<T extends string>({
	label,
	value,
	options,
	onChange,
	align = "end",
	active = false,
	className,
}: FilterDropdownProps<T>) {
	const current = options.find((o) => o.value === value);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={[
					"inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					active
						? "border-primary/40 bg-primary/5"
						: "border-input bg-background",
					className ?? "",
				].join(" ")}
			>
				{label && <span className="text-muted-foreground">{label}:</span>}
				<span>{current?.label ?? value}</span>
				<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="min-w-[140px]">
				{options.map((o) => {
					const selected = o.value === value;
					return (
						<DropdownMenuItem
							key={o.value}
							onClick={() => onChange(o.value)}
							className={selected ? "bg-accent text-accent-foreground" : ""}
						>
							<Check
								className={[
									"w-3.5 h-3.5",
									selected ? "opacity-100" : "opacity-0",
								].join(" ")}
							/>
							{o.label}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
