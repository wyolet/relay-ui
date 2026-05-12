import { Search } from "lucide-react";

interface SearchBoxProps {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	"aria-label"?: string;
}

export function SearchBox({
	value,
	onChange,
	placeholder = "Search",
	"aria-label": ariaLabel,
}: SearchBoxProps) {
	return (
		<div className="relative w-56">
			<Search
				className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
				aria-hidden="true"
			/>
			<input
				type="search"
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
				placeholder={placeholder}
				aria-label={ariaLabel ?? placeholder}
				className="w-full h-8 pl-8 pr-3 rounded-md text-xs text-foreground bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent transition-shadow"
			/>
		</div>
	);
}
