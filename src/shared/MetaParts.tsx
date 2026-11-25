import { cn } from "@/lib/utils";

/** A row's quiet facts ("Anthropic", "prioritized", "1 account") side by side, spaced rather than dot-joined. */
export function MetaParts({
	parts,
	className,
}: {
	parts: string | readonly string[];
	className?: string;
}) {
	const list = typeof parts === "string" ? [parts] : parts;
	return (
		<span
			className={cn(
				"inline-flex min-w-0 flex-wrap gap-x-3 text-[11px] text-muted-foreground",
				className,
			)}
		>
			{list.map((part) => (
				<span key={part} className="truncate">
					{part}
				</span>
			))}
		</span>
	);
}
