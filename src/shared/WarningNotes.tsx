import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Non-blocking warnings under a row or field, one line each. */
export function WarningNotes({
	notes,
	className,
}: {
	notes: readonly string[];
	className?: string;
}) {
	if (notes.length === 0) return null;
	return (
		<ul className={cn("flex flex-col gap-0.5", className)}>
			{notes.map((note) => (
				<li
					key={note}
					className="flex items-start gap-1 text-[11px] text-warning"
				>
					<TriangleAlert
						className="mt-0.5 w-3 h-3 shrink-0"
						aria-hidden="true"
					/>
					{note}
				</li>
			))}
		</ul>
	);
}
